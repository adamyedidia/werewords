import random

d = {
        '_times': (lambda x, y: x * y, '[2|3] = 6'),
        '_plus': (lambda x, y: x + y, '[2:3] = 5'),
        'div': (lambda x, y: x / y, 'div[2:3] = 2/3'),
        'pow': (lambda x, y: x ** y, 'pow[2:3] = 9'),
        'equal': (lambda x, y: 1 if x == y else 0, 'equal[2:2] = 1'),
        'and': (lambda x, y: x and y, 'and[0:1] = 0'),
        'or': (lambda x, y: x or y, 'or[0:1] = 1'),
        'gt': (lambda x, y: 1 if x > y else 0, 'gt[2:3] = 0'),
        'mod': (lambda x, y: x % y, 'mod[3:2] = 1'),
        'rand': (lambda x, y: random.random() * (y - x) + x, 'rand[3:4] = random between 3 and 4')
    }

def splitIntoArgs(s):
    arg = None
    if s[0] != '[':
        i = s.index('[')
        arg = s[:i].lower()
        s = s[i:]
    count_parentheses = 0
    for i in range(len(s)):
        if s[i] == '[':
            count_parentheses += 1
        elif s[i] == ']':
            count_parentheses -= 1
        elif s[i] == '|' and count_parentheses == 1:
            if arg:
                raise('| used as argument delimiter?')
            return ['_times', s[1:i], s[i+1:-1]]
        elif s[i] == ':' and count_parentheses == 1:
            return [arg if arg else '_plus', s[1:i], s[i+1:-1]]

def bc(s):
    v = None
    try:
        v = float(s)
    except:
        pass
    if v is not None:
        return v
    x, y, z = splitIntoArgs(s)
    return d[x][0](bc(y), bc(z))

def bc_functions():
    return {k: d[k][1] for k in d.keys()}
