import re
import random
import time
from enum import Enum

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

def _and(*nums):
    if not nums:
        raise(Exception("Arguments to 'and' can't be empty"))
    ret = nums[0]
    for num in nums[1:]:
        ret = ret and num
    return ret

def _or(*nums):
    if not nums:
        raise(Exception("Arguments to 'or' can't be empty"))
    ret = nums[0]
    for num in nums[1:]:
        ret = ret or num
    return ret

def _equal(*nums):
    return int(len(set(nums)) <= 1)

class AnonymousFunctions(str, Enum):
    TIMES = '_anonymous_times'
    PLUS = '_anonymous_plus'

functions = {
        AnonymousFunctions.TIMES: (prod, '[2|3] = 6'),
        AnonymousFunctions.PLUS: (add, '[2:3] = 5'),
        'div': (lambda x, y: x / y, 'div[2:3] = 2/3'),
        'pow': (lambda x, y: x ** y, 'pow[2:3] = 8'),
        'equal': (_equal, 'equal[2:2] = 1'),
        'and': (_and, 'and[0:1] = 0'),
        'or': (_or, 'or[0:1] = 1'),
        'gt': (lambda x, y: int(x > y), 'gt[2:3] = 0'),
        'mod': (lambda x, y: x % y, 'mod[3:2] = 1'),
        'rand': (lambda : random.random(), 'rand[] = random between 0 and 1'),
        'if': (lambda x, y, z: y if x else z, 'if[1:3:4] = 4'),
        'abs': (lambda x : abs(x), 'abs[-3] = 3'),
        'time': (lambda : time.time(), 'time[] = 1680909037')
    }

regex_matches = [
    *[x for x in functions.keys() if isinstance(x, str)],
    "-?[0-9]+\.?[0-9]*",
    ":",
    "\[",
    "\]",
    "\|",
]

regex_string = '|'.join(regex_matches)

def tokenize(input):
    ret = re.findall(regex_string, input)
    if "".join(ret) != input.replace(" ","").replace("\n", ""):
        raise(Exception('Unrecognized tokens in input string'))
    return ret

def evaluate_inner(expression):
    
    stack = []

    def push(l, x):
        l += [x]

    def process_token(token):
        if token != ']':
            push(stack, token)
        
        else:
            args = []
            function = None
            recent_value = stack.pop()
            while recent_value != '[':
                if recent_value == ':':
                    if function is not None:
                        raise(Exception('Both pipe and colon used as delimiter'))
                elif recent_value == '|':
                    function = AnonymousFunctions.TIMES
                else:
                    push(args, float(recent_value))
                recent_value = stack.pop()
            if stack and stack[-1] in functions:
                if function is not None:
                    raise(Exception(f'Pipe used as delimiter for function {stack[-1]}'))
                function = stack[-1]
                stack.pop()
            function = function if function else AnonymousFunctions.PLUS
            args.reverse()
            push(stack, functions[function][0](*args))


    for token in expression:
        process_token(token)
    
    return stack

def evaluate(code):
    v = evaluate_inner(tokenize(code.lower()))
    if len(v) == 1:
        return float(v[0])
    else:
        raise(Exception('Malformed input'))

def list_functions():
    return {k: v[1] for k, v in functions.items()}