def normalize(s):
    return s.strip().lower()

def splitNormalize(word, splitby=None):
    w = normalize(word)
    if splitby != None:
        return [normalize(x) for x in w.split(splitby)]
    else:
        return [w]
