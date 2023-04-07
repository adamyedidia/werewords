d = {
        'anonymous_times': lambda x, y: x * y,
        'anonymous_plus': lambda x, y: x + y,
        'div': lambda x, y: x / y,
        'pow': lambda x, y: x ** y,
        'equal': lambda x, y: 1 if x == y else 0,
        'and': lambda x, y: x and y,
        'or': lambda x, y: x or y,
        'gt': lambda x, y: 1 if x > y else 0,
        'mod': lambda x, y: x % y,
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
            return ['anonymous_times', s[1:i], s[i+1:-1]]
        elif s[i] == ':' and count_parentheses == 1:
            return [arg if arg else 'anonymous_plus', s[1:i], s[i+1:-1]]

def bc(s):
    v = None
    try:
        v = int(s)
    except:
        pass
    if v is not None:
        return v
    x, y, z = splitIntoArgs(s)
    return d[x](bc(y), bc(z))

def bc_functions():
    return d.keys()