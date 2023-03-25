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
from secrets import compare_digest, token_hex
from redis_utils import rget, rset
import nltk
nltk.download('wordnet')
from nltk.stern import WordNetLemmatizer

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
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        return ('', 204, headers)

    if not request.json: 
        goal_word = request.json.get('goalWord')
        if not goal_word:
            goal_word = random.choice(WORDS)
    else:
        goal_word = random.choice(WORDS)

    game_start_time = time.time()

    game_id = token_hex(40)

    rset('sounds_like_hints', '[]', game_id=game_id)
    rset('meaning_hints', '[]', game_id=game_id)
    rset('goal_word', goal_word, game_id=game_id)
    rset('game_start_time', game_start_time, game_id=game_id)
    rset('question_count', '0', game_id=game_id)

    return _process_response({
        'goalWord': goal_word,
        'gameStartTime': game_start_time,
        'gameId': game_id,
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
    game_id = request.json.get('gameId')

    try:
        hint_type = HintType(hint_type)
    except ValueError:
        return _process_response(_failure_response(f'Invalid hint type {hint_type}'))

    if hint_type == HintType.SOUNDS_LIKE:
        sounds_like_hints = json.loads(rget('sounds_like_hints', game_id=game_id) or '[]')
        sounds_like_hints = [h for h in sounds_like_hints if not h == hint]
        rset('sounds_like_hints', json.dumps(sounds_like_hints), game_id=game_id)
    elif hint_type == HintType.MEANING:
        meaning_hints = json.loads(rget('meaning_hints', game_id=game_id) or '[]')
        meaning_hints = [h for h in meaning_hints if not h == hint]
        rset(f'meaning_hints', json.dumps(meaning_hints), game_id=game_id)

    return _process_response({
        'soundsLikeHints': json.loads(rget('sounds_like_hints', game_id=game_id) or '[]'),
        'meaningHints': json.loads(rget('meaning_hints', game_id=game_id) or '[]')
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
    game_id = request.json.get('gameId')

    try:
        hint_type = HintType(hint_type)
    except ValueError:
        return _process_response(_failure_response(f'Invalid hint type {hint_type}'))
    
    if hint_type == HintType.SOUNDS_LIKE:
        sounds_like_hints = json.loads(rget('sounds_like_hints', game_id=game_id) or '[]')
        sounds_like_hints.append(hint)
        rset('sounds_like_hints', json.dumps(sounds_like_hints), game_id=game_id)
    elif hint_type == HintType.MEANING:
        meaning_hints = json.loads(rget('meaning_hints', game_id=game_id) or '[]')
        meaning_hints.append(hint)
        rset('meaning_hints', json.dumps(meaning_hints), game_id=game_id)

    return _process_response({
        'soundsLikeHints': json.loads(rget('sounds_like_hints', game_id=game_id) or '[]'),
        'meaningHints': json.loads(rget('meaning_hints', game_id=game_id) or '[]')
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
    game_id = request.json.get('gameId')

    sounds_like_hints = json.loads(rget('sounds_like_hints', game_id=game_id) or '[]')
    meaning_hints = json.loads(rget('meaning_hints', game_id=game_id) or '[]')


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
        rset('messages', '[]', game_id=game_id)
        messages = []
    else:
        try:
            user_reply = UserReply(raw_user_reply)
        except ValueError:
            return _process_response(_failure_response(f'Invalid user reply {raw_user_reply}'))        
        messages = json.loads(rget('messages', game_id=game_id) or '[]')
        messages.append({"role": "assistant", "content": new_question})
        messages.append({"role": "user", "content": process_user_reply(user_reply, sounds_like_hints, meaning_hints)})    
        rset('messages', json.dumps(messages), game_id=game_id)    

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

    goal_word = rget('goal_word', game_id=game_id)

    victory = False
    victory_time = None
    winning_question = None

    def have_same_root(word1, word2):
        lemmatizer = WordNetLemmatizer()
        lemma1 = lemmatizer.lemmatize(word1)
        lemma2 = lemmatizer.lemmatize(word2)
        return lemma1 == lemma2

    for question in new_questions:
        for word in question.split():       
            if have_same_root(word.replace('?', '').replace('.', '').replace(',', '').replace('!', '').replace('"', '').replace("'", '').strip().lower(), goal_word):
                victory = True
                game_start_time = rget('game_start_time', game_id=game_id)
                if game_start_time is not None:
                    victory_time = time.time() - float(game_start_time)
                    winning_question = question

    return _process_response({'success': True, 'victory': victory, 'victoryTime': victory_time, 'winningQuestion': winning_question, 'goalWord': goal_word, 'questions': new_questions})


# Start the server
if __name__ == '__main__':
    print('app running!')
    app.run(host='0.0.0.0', port=5000)