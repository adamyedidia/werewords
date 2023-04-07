import random
import time

d = {
        '_anonymous_times': (lambda x, y: x * y, '[2|3] = 6'),
        '_anonymous_plus': (lambda x, y: x + y, '[2:3] = 5'),
        'div': (lambda x, y: x / y, 'div[2:3] = 2/3'),
        'pow': (lambda x, y: x ** y, 'pow[2:3] = 9'),
        'equal': (lambda x, y: 1 if x == y else 0, 'equal[2:2] = 1'),
        'and': (lambda x, y: x and y, 'and[0:1] = 0'),
        'or': (lambda x, y: x or y, 'or[0:1] = 1'),
        'gt': (lambda x, y: 1 if x > y else 0, 'gt[2:3] = 0'),
        'mod': (lambda x, y: x % y, 'mod[3:2] = 1'),
        'rand': (lambda x, y: random.random() * (y - x) + x, 'rand[3:4] = random between 3 and 4'),
        'if': (lambda x, y, z: y if x else z, 'if[1:3:4] = 4'),
        'abs': (lambda x : abs(x), 'abs[-3] = 3'),
        'time': (lambda : time.time(), 'time[] = 1680909037')
    }

def splitIntoArgs(s):
    arg = None
    if s[0] != '[':
        i = s.index('[')
        arg = s[:i].lower()
        s = s[i:]
    if s == '[]':
        return [arg, []]
    ret = []
    j = 1
    count_parentheses = 0
    for i in range(len(s)):
        if s[i] == '[':
            count_parentheses += 1
        elif s[i] == ']':
            count_parentheses -= 1
        elif s[i] == '|' and count_parentheses == 1:
            if arg:
                raise(Exception('| used as argument delimiter?'))
            ret.append(s[j:i])
            j = i + 1
            arg = '_anonymous_times'
        elif s[i] == ':' and count_parentheses == 1:
            ret.append(s[j:i])
            j = i + 1
    return [arg if arg else '_anonymous_plus', ret + [s[j:-1]]]

def bc(s):
    v = None
    try:
        v = float(s)
    except:
        pass
    if v is not None:
        return v
    f, args = splitIntoArgs(s)
    return d[f][0](*[bc(x) for x in args])

def bc_functions():
    return {k: d[k][1] for k in d.keys()}

