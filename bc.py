import random
import time
from enum import Enum
import black

def add(*nums):
    ret = 0
    for num in nums:
        ret += num
    return ret

def prod(*nums):
    ret = 1
    for num in nums:
        ret *= num
    return ret

def _equal(*nums):
    return int(len(set(nums)) <= 1)

class SpecialFunctions(str, Enum):
    TIMES = '_anonymous_times'
    PLUS = '_anonymous_plus'
    IF = 'if'
    LET = 'let'
    OR = 'or'
    AND = 'and'
    LAMBDA = 'lambda'
    
def _raise(e):
    raise e

functions = {
        'div': (lambda x, y: x / y, 'div[2:3] = 2/3'),
        'pow': (lambda x, y: x ** y, 'pow[2:3] = 8'),
        'equal': (_equal, 'equal[2:2] = 1'),
        'gt': (lambda x, y: int(x > y), 'gt[2:3] = 0'),
        'mod': (lambda x, y: x % y, 'mod[3:2] = 1'),
        'rand': (lambda : random.random(), 'rand[] = random between 0 and 1'),
        'if': (lambda x, y, z: y if x else z, 'if[1:3:4] = 4'),
        'abs': (lambda x : abs(x), 'abs[-3] = 3'),
        'time': (lambda : time.time(), 'time[] = 1680909037'),
        'error': (lambda : _raise(Exception('user requested error')), 'error[] = user requested error')
    }

lambda_example = 'let [ square_plus_two : lambda [ [ pow [ $1 : 2 ] : 2 ] ] : square_plus_two [ 3 ] ]'

special_functions = {
        SpecialFunctions.TIMES: '[2|3] = 6',
        SpecialFunctions.PLUS: '[2:3] = 5',
        SpecialFunctions.IF: 'if[1:2:3] = 2',
        SpecialFunctions.LET: 'let[apple:2:[apple:3]] = 5',
        SpecialFunctions.AND: 'and[1:0] = 0',
        SpecialFunctions.OR: 'or[1:0] = 1',
        SpecialFunctions.LAMBDA: lambda_example + ' = 11'
    }

def evaluate_lambda(f, env, args):
    f = ":".join(f)
    env = {**env, **{'$' + str(i + 1) : evaluate(x, env) for i, x in enumerate(args)}}
    return evaluate(f, env)            

def splitIntoArgs(s):
    arg = s.split('[')[0].lower() 
    s = s.removeprefix(arg) if arg else s
    if len(s) <= 1:
        m = 'empty string' if not s else arg + s 
        raise Exception(f'Failed recursing on {m}') 
    if not (s[0] == '[' and s[-1] == ']'):
        raise Exception('Parentheses mismatch')
    if s == '[]':
        return [arg, []]
    args = []
    j = 1
    count_parentheses = 0
    for i in range(len(s)):
        if s[i] == '[':
            count_parentheses += 1
        elif s[i] == ']':
            count_parentheses -= 1
        elif s[i] == '|' and count_parentheses == 1:
            if arg and arg != SpecialFunctions.TIMES:
                raise(Exception('| used as argument delimiter?'))
            args.append(s[j:i])
            j = i + 1
            arg = SpecialFunctions.TIMES
        elif s[i] == ':' and count_parentheses == 1:
            if arg == SpecialFunctions.TIMES:
                raise(Exception("multiplication must be pipe delimited"))
            args.append(s[j:i])
            j = i + 1
            arg = arg if arg else SpecialFunctions.PLUS
    return [arg, args + [s[j:-1]]]

def try_literal(s, env):
    try:
        return float(s)
    except:
        pass
    try:
        return env[s]
    except:
        pass
    return None

def evaluate_outer(s):
    return evaluate(s.replace(' ','').replace('\n',''), {})

def evaluate(s, env):
    literal_value = try_literal(s, env)
    if literal_value is not None:
        return literal_value
    f, args = splitIntoArgs(s)
    try:
        f = SpecialFunctions(f)
    except:
        pass
    if f not in functions and f not in special_functions and f not in env:
        raise(Exception(f'unknown function {f} called on {args}'))
    if f in env:
        return evaluate_lambda(env[f], env, args)
    if f == SpecialFunctions.LAMBDA:
        return args
    if f == SpecialFunctions.LET:
        if len(args) != 3:
            raise(Exception('let binding takes 3 arguments'))
        if args[0].startswith('$'):
            raise(Exception('$ is reserved for lambda arguments'))
        return evaluate(args[2], {**env, args[0]: evaluate(args[1], env)})
    if f == SpecialFunctions.TIMES:
        return prod(*[evaluate(x, env) for x in args])
    if f == SpecialFunctions.PLUS:
        return add(*[evaluate(x, env) for x in args])   
    # Need a special case to not evaluate the arguments of if when the condition is false
    # Not that that really matters since errors are rare but it lets you do if plus error
    if f == SpecialFunctions.IF:
        if len(args) != 3:
            raise(Exception('if takes 3 arguments'))
        return evaluate(args[1], env) if evaluate(args[0], env) else evaluate(args[2], env)
    if f == SpecialFunctions.AND:
        if not args:
            raise(Exception("Arguments to 'and' can't be empty"))
        ret = evaluate(args[0], env)
        for arg in args[1:]:
            ret = ret and evaluate(arg, env)
        return ret
    if f == SpecialFunctions.OR:
        if not args:
            raise(Exception("Arguments to 'or' can't be empty"))
        ret = evaluate(args[0], env)
        for arg in args[1:]:
            ret = ret or evaluate(arg, env)
        return ret
    if f == SpecialFunctions.LAMBDA:
        if not args:
            raise(Exception("Arguments to 'lambda' can't be empty"))
    return functions[f][0](*[evaluate(x, env) for x in args])

function_descriptions = {k: v[1] for k, v in functions.items()}

def list_functions():
    return dict(function_descriptions, **special_functions)

substitutions = {
    '[': '(',
    ']': ')',
    ':' : '+',
    'and': '_and',
    'or': '_or',
    'if': '_if',
    'lambda': '_lambda',
    '$': '_dollar_sign_asdf',
}

def format(bc):
    for k, v in substitutions.items():
        bc = bc.replace(k, v)
    bc = black.format_str(bc, mode=black.FileMode(line_length=10, magic_trailing_comma=False))
    for k, v in substitutions.items():
        bc = bc.replace(v, k)
    return bc

if __name__ == '__main__':
    print(evaluate_outer(input('')))
