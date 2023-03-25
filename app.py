from flask import Flask, jsonify, request, make_response
import openai
import requests
from settings import OPENAI_SECRET_KEY, PASSWORD
import logging
from werkzeug.exceptions import BadRequest
from typing import Optional, Any
import threading
import json
from enum import Enum
from words import WORDS
import random
import time
from secrets import compare_digest


import redis as r

redis = r.Redis(connection_pool=r.ConnectionPool(host='localhost', port=6379, db=0))
pretend_redis_dict: dict[str, Optional[str]] = {}

app = Flask(__name__)
logger = logging.getLogger(__name__)

class UserReply(Enum):
    YES = 'yes'
    NO = 'no'
    MAYBE = 'maybe'
    BROADEN_OUT = 'broaden_out'
    HINTS_REMINDER = 'hints_reminder'


class HintType(Enum):
    SOUNDS_LIKE = 'sounds_like'
    MEANING = 'meaning'


# Define some example data for the API
students = [
    {'id': 1, 'name': 'Alice', 'age': 21},
    {'id': 2, 'name': 'Bob', 'age': 23},
    {'id': 3, 'name': 'Charlie', 'age': 20}
]

@app.route("/")
def index():
    return "<h1>Hello!</h1>"

def create_app():
   return app


def _process_response(raw_resp: dict[str, Any]) -> Any:
    resp = jsonify(raw_resp)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    print(resp.headers)
    return add_cors_headers(resp)


def _failure_response(reason: Optional[str] = None) -> dict[str, Any]:
    return {'success': False, **({'reason': reason} if reason is not None else {})}


def process_user_reply(user_reply: UserReply, sounds_like_hints: Optional[list[str]], meaning_hints: Optional[list[str]]) -> str:
    if user_reply in [UserReply.YES, UserReply.NO, UserReply.MAYBE]:
        return user_reply.value
    elif user_reply == UserReply.BROADEN_OUT:
        return "This line of questioning is too narrow; try broadening the level of your questions."
    elif user_reply == UserReply.HINTS_REMINDER:
        if sounds_like_hints is not None:
            if meaning_hints is not None:
                return (
                    f"As a hint, my word sounds similar to the following words: {', '.join(sounds_like_hints)}. "
                    f"It also has a meaning related to the following words: {', '.join(meaning_hints)}. "
                    f"Try guessing my word now!"
                )
            else:
                return (
                    f"As a hint, my word sounds similar to the following words: {', '.join(sounds_like_hints)}. "
                    f"Try guessing my word now!"
                )
        else:
            if meaning_hints is not None:
                return (
                    f"As a hint, my word has a meaning related to the following words: {', '.join(meaning_hints)}. "
                    f"Try guessing my word now!"            
                )
            else:
                return "Try guessing my word now!"
    else:
        raise Exception(f"Invalid user reply {user_reply}")


def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response


@app.route('/new_game', methods=['POST', 'OPTIONS'])
def start_new_game():
    redis.set('sounds_like_hints', '[]')
    redis.set('meaning_hints', '[]')

    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        return ('', 204, headers)

    print(request.json)
    print(request)
    print(request.json.get('goalWord'))

    if not request.json or not (goal_word := request.json.get('goalWord')):
        goal_word = random.choice(WORDS)
    game_start_time = time.time()

    redis.set('goal_word', goal_word)
    redis.set('game_start_time', game_start_time)

    return _process_response({
        'goalWord': goal_word,
        'gameStartTime': game_start_time,
    })


@app.route("/hints", methods=['DELETE', 'OPTIONS'])
def delete_hint():
    openai.api_key = OPENAI_SECRET_KEY
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        return ('', 204, headers)
    
    hint = request.json.get('hint')
    hint_type = request.json.get('hintType')

    try:
        hint_type = HintType(hint_type)
    except ValueError:
        return _process_response(_failure_response(f'Invalid hint type {hint_type}'))
    
    if hint_type == HintType.SOUNDS_LIKE:
        sounds_like_hints = json.loads(redis.get('sounds_like_hints') or '[]')
        sounds_like_hints = [h for h in sounds_like_hints if not h == hint]
        redis.set('sounds_like_hints', json.dumps(sounds_like_hints))
    elif hint_type == HintType.MEANING:
        meaning_hints = json.loads(redis.get('meaning_hints') or '[]')
        meaning_hints = [h for h in meaning_hints if not h == hint]
        redis.set('meaning_hints', json.dumps(meaning_hints))

    return _process_response({
        'soundsLikeHints': json.loads(redis.get('sounds_like_hints') or '[]'),
        'meaningHints': json.loads(redis.get('meaning_hints') or '[]')
    })


@app.route("/hints", methods=['POST', 'OPTIONS'])
def make_word_into_hint():
    openai.api_key = OPENAI_SECRET_KEY
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        return ('', 204, headers)
    
    hint = request.json.get('hint')
    hint_type = request.json.get('hintType')

    try:
        hint_type = HintType(hint_type)
    except ValueError:
        return _process_response(_failure_response(f'Invalid hint type {hint_type}'))
    
    if hint_type == HintType.SOUNDS_LIKE:
        sounds_like_hints = json.loads(redis.get('sounds_like_hints') or '[]')
        sounds_like_hints.append(hint)
        redis.set('sounds_like_hints', json.dumps(sounds_like_hints))
    elif hint_type == HintType.MEANING:
        meaning_hints = json.loads(redis.get('meaning_hints') or '[]')
        meaning_hints.append(hint)
        redis.set('meaning_hints', json.dumps(meaning_hints))

    return _process_response({
        'soundsLikeHints': json.loads(redis.get('sounds_like_hints') or '[]'),
        'meaningHints': json.loads(redis.get('meaning_hints') or '[]')
    })


@app.route("/questions", methods=['POST', 'OPTIONS'])
def get_response():
    # set your API key
    openai.api_key = OPENAI_SECRET_KEY

    
    # logger.warning('hello')
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        return ('', 204, headers)  
    
    if not compare_digest(request.json.get('password') or '', PASSWORD):
        return _process_response(_failure_response('Wrong password'))

    # set the endpoint URL
    url = "https://api.openai.com/v1/engines/davinci-codex/completions"

    new_question = request.json.get('newQuestion')
    raw_user_reply = request.json.get('userReply')

    sounds_like_hints = json.loads(redis.get('sounds_like_hints') or '[]')
    meaning_hints = json.loads(redis.get('meaning_hints') or '[]')


    sounds_like_hints_initial_str = (
        f'As a hint, my word sounds similar to the following words: {", ".join(sounds_like_hints)}. ' 
        if sounds_like_hints else ''
    )
    meaning_hints_initial_str = (
        f'As a hint, my word has a meaning related to the following words: {", ".join(meaning_hints)}. ' 
        if meaning_hints else ''
    )

    if new_question is None or raw_user_reply is None:
        # Start over command
        redis.set('messages', '[]')
        messages = []
    else:
        try:
            user_reply = UserReply(raw_user_reply)
        except ValueError:
            return _process_response(_failure_response(f'Invalid user reply {raw_user_reply}'))        
        messages = json.loads(redis.get('messages') or '[]')
        messages.append({"role": "assistant", "content": new_question})
        messages.append({"role": "user", "content": process_user_reply(user_reply, sounds_like_hints, meaning_hints)})    
        redis.set('messages', json.dumps(messages))    

    if len(raw_user_reply or '') > 1000 or len(new_question or '') > 1000:
        return _process_response(_failure_response('Input too long'))

    # messages.append({'content': response['choices'][0]['message']['content'], 'role': 'assistant'})


    messages = [
                {"role": "system", "content": "You are a player in a fun game."},
                {"role": "user", "content": (
                        "Let's play a game. The game is like twenty questions, " 
                        "except that there is no limit on the number of questions asked, "
                        "and the word you're trying to guess is going to be tougher than an ordinary twenty "
                        "questions word. If your questions don't "
                        "seem to be making any progress, try asking about a broader class of things. I'll think of a word, "
                        "and you try to find the word using only questions which I will answer only with \"yes\", \"no\", "
                        "\"maybe\", or a reminder to try asking broader questions. Sometimes, I will tell you other words " 
                        "that hint at my word, or remind you of those words. The hints might sound like my word, or they might be related "
                        "to my word via their meaning. Sound good?" 
                    )
                },
                {"role": "assistant", "content": "Sounds fun! Let's play. Have you thought of a word?"},
                {"role": "user", "content": f"Yes, please go ahead and start! Please ask me a question about my word!"},
                *messages,
            ]
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=1.0,
        n=3,
    )

    new_questions = [choice['message']['content'] for choice in response['choices']]

    goal_word = redis.get('goal_word')

    victory = False
    victory_time = None

    for question in new_questions:
        for word in question.split():       
            if word.replace('?', '').replace('.', '').replace(',', '').replace('!', '').replace('"', '').replace("'", '').strip().lower() == goal_word.decode('utf-8'):
                victory = True
                if (game_start_time := redis.get('game_start_time')) is not None:
                    victory_time = time.time() - float(game_start_time)

    return _process_response({'success': True, 'victory': victory, 'victoryTime': victory_time, 'goalWord': goal_word.decode('utf-8'), 'questions': new_questions})


# Start the server
if __name__ == '__main__':
    print('app running!')
    app.run(debug=True)