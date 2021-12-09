#!/usr/bin/env python3
# read json in

import json
from aiohttp import web
import argparse

import utils

# load the files
formatted = 'formatted.json'

e = json.load(open(formatted))

def filter(questionName, filter_values, e, splitby=None):
    filtered = {}
    def answerMatches(resp):
        if resp is None:
            return False
        elif isinstance(resp, list):
            return not set(resp).isdisjoint(filter_values)
        else:
            return not set(utils.splitNormalize(resp, splitby)).isdisjoint(filter_values)

    for x in e.values():
        if answerMatches(x.get(questionName, None)):
            filtered[x['id']] = x

    return filtered

def apply_filters(filters, e, splitby=None):
    filtered = e
    for filter_column, filter_values in filters:
        filtered = filter(filter_column, filter_values, filtered, splitby=',')
    return filtered


def questionAnswers(questionname, personsdict):
    return [x[questionname] for x in personsdict.values() if questionname in x]

def rankAnswers(questionName, e, splitby=None):
    l = questionAnswers(questionName, e)
    countDict = {}
    for word in l:
        if isinstance(word, list):
            tokens = word
        else:
            tokens = utils.splitNormalize(word)
        for token in tokens:
            countDict[token] = countDict.get(token, 0) + 1

    return countDict

def parseFilter(filters):
    a = [x.split(':') for x in filters]
    b = [(x[0], x[1].split(',')) for x in a ]
    return b

def indexAnswers(keyQuestionName, valueQuestionName, e, splitby=None):
    index = {}
    for person in e.values():
        word = person.get(keyQuestionName, None)
        if word:
            tokens = utils.splitNormalize(word, splitby)
            for token in tokens:
                if not token in index:
                    index[token] = []
                if valueQuestionName in person:
                    for value in splitNormalize(person[valueQuestionName]):
                        index[token].append(value)
    return index

default_headers = {
    'Access-Control-Allow-Origin': '*'
}

async def handle_questions_answers(request):
    name = utils.normalize(request.match_info.get('question_name', None))
    filters = request.query.getall('filter', [])
    filtered = apply_filters(parseFilter(filters), e, ',')
    json = questionAnswers(name, filtered)
    return web.json_response(json, headers=default_headers)

async def handle_answers(request):
    filters = request.query.getall('filter', [])
    filtered = apply_filters(parseFilter(filters), e, ',')
    return web.json_response(filtered, headers=default_headers)

async def handle_rank_answers(request):
    name = utils.normalize(request.match_info.get('question_name', None))
    filters = request.query.getall('filter', [])
    filtered = apply_filters(parseFilter(filters), e, ',')
    splitby = request.query.get('splitby')
    json = rankAnswers(name, filtered, splitby)
    return web.json_response(json, headers=default_headers)

async def handle_grouping(request):
    key = utils.normalize(request.match_info.get('key_question_name', None))
    value = utils.normalize(request.match_info.get('value_question_name', None))
    filters = request.query.getall('filter', [])
    filtered = apply_filters(parseFilter(filters), e, ',')
    splitby = request.query.get('splitby')
    json = indexAnswers(key, value, filtered, splitby)
    return web.json_response(json, headers=default_headers)

endpoints = [('/answers', handle_answers, "Returns all answers for all questions."),
             ('/questions_answers/{question_name}', handle_questions_answers, "Returns all answers for a single question."),
             ('/rank/{question_name}', handle_rank_answers, "Returns repeated answer counts for a question."),
             ('/grouping/{key_question_name}/{value_question_name}', handle_grouping, "Returns answers for a questions grouped by answers to a different question.")]

async def handle_root(request):
    supported_methods = [{'route': x[0], 'documentation': x[2]} for x in endpoints]
    return web.json_response(supported_methods, headers=default_headers)

endpoints.insert(0, ('/', handle_root, "Api root"))


app = web.Application()
app.add_routes([web.get(x[0], x[1]) for x in endpoints])

parser = argparse.ArgumentParser(description='ccu hackathon api')
parser.add_argument('--port', type=int, default=8081, nargs='?')

if __name__ == '__main__':
    args = parser.parse_args()
    web.run_app(app, port=args.port)
