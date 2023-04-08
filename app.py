from flask import Flask, jsonify, request, make_response
from flask_cors import CORS, cross_origin
import openai
import requests
from settings import OPENAI_SECRET_KEY, PASSWORD, LOCAL
import logging
from werkzeug.exceptions import BadRequest
from typing import Optional, Any
import threading
import json
from enum import Enum
from words import DEFAULT_WORDS, EASY_PDT_WORDS, HARD_PDT_WORDS, HARD_MATH_WORDS, HOWITZER, TULLE, US, UK, VERY_HARD_WORDS, CHARACTER_WORDS, TEST, BANNED_VINTAGE_CARDS
import random
import time
import re
from secrets import compare_digest, token_hex
from redis_utils import rget, rset
from functools import wraps
from threading import Lock
from bc import bc, bc_functions

app = Flask(__name__)
CORS(app)
logger = logging.getLogger(__name__)

leaderboard_lock = Lock()

class UserReply(Enum):
    YES = 'yes'
    NO = 'no'
    MAYBE = 'maybe'
    BROADEN_OUT = 'broaden_out'
    HINTS_REMINDER = 'hints_reminder'
    ROOTS_REMINDER = 'roots_reminder'


class HintType(Enum):
    SOUNDS_LIKE = 'sounds_like'
    MEANING = 'meaning'

class GoalWordType(Enum):
    TEST = 'test'
    EASY = 'easy'
    MEDIUM = 'medium'
    HARD = 'hard'
    HARD_MATH = 'hard math'
    VERY_HARD = 'very hard'
    HOWITZER = 'howitzer'
    TULLE = 'tulle'
    US = 'us'
    UK = 'uk'
    CHARACTERS = 'characters'
    VINTAGE = 'vintage'

word_type_to_words_list = {
    GoalWordType.TEST: TEST,
    GoalWordType.EASY: EASY_PDT_WORDS,
    GoalWordType.MEDIUM: DEFAULT_WORDS,
    GoalWordType.HARD: HARD_PDT_WORDS,
    GoalWordType.HARD_MATH: HARD_MATH_WORDS,
    GoalWordType.VERY_HARD: VERY_HARD_WORDS,
    GoalWordType.HOWITZER: HOWITZER,
    GoalWordType.TULLE: TULLE,
    GoalWordType.US: US,
    GoalWordType.UK: UK,
    GoalWordType.CHARACTERS: CHARACTER_WORDS,
    GoalWordType.VINTAGE: BANNED_VINTAGE_CARDS,

}


def get_goal_word_type(goal_word: str) -> Optional[GoalWordType]:
    for k, v in word_type_to_words_list.items():
        if goal_word in v:
            return k
    return None
    
# Define some example data for the API
students = [
    {'id': 1, 'name': 'Alice', 'age': 21},
    {'id': 2, 'name': 'Bob', 'age': 23},
    {'id': 3, 'name': 'Charlie', 'age': 20}
]

def api_endpoint(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
            return ('', 204, headers)
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def index():
    return "<h1>Hello!</h1>"

def create_app():
   return app


def _process_response(raw_resp: dict[str, Any]) -> Any:
    return jsonify(raw_resp)


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
            
    elif user_reply == UserReply.ROOTS_REMINDER:
        return (
            f"Try listing the first ten words you think of that share a lemma with at least one of the following words: {', '.join([*(meaning_hints or []), *(sounds_like_hints or [])])}"
            f"For example, colorful shares a lemma with color"
        )
    else:
        raise Exception(f"Invalid user reply {user_reply}")


def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response


@app.route('/new_game', methods=['POST', 'OPTIONS'])
@api_endpoint
def start_new_game():
    if request.json: 
        goal_word = request.json.get('goalWord')
        if not goal_word:
            goal_words = DEFAULT_WORDS
            goal_word_type = request.json.get('goalWordType')
            try: 
                goal_word_type = GoalWordType(goal_word_type)
            except:
                print('Invalid goal word type, using default')
            if goal_word_type in word_type_to_words_list:
                goal_words = word_type_to_words_list[goal_word_type]
            goal_word = random.choice(goal_words)
    else:
        goal_word = random.choice(DEFAULT_WORDS)

    goal_word = goal_word.lower()
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
@api_endpoint
def delete_hint():
    openai.api_key = OPENAI_SECRET_KEY
    
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
@api_endpoint
def make_word_into_hint():
    openai.api_key = OPENAI_SECRET_KEY
    
    hint = request.json.get('hint')
    hint_type = request.json.get('hintType')
    game_id = request.json.get('gameId')

    try:
        hint_type = HintType(hint_type)
    except ValueError:
        return _process_response(_failure_response(f'Invalid hint type {hint_type}'))
    
    if hint_type == HintType.SOUNDS_LIKE:
        sounds_like_hints = json.loads(rget('sounds_like_hints', game_id=game_id) or '[]')
        if hint not in sounds_like_hints:
            sounds_like_hints.append(hint)
        rset('sounds_like_hints', json.dumps(sounds_like_hints), game_id=game_id)
    elif hint_type == HintType.MEANING:
        meaning_hints = json.loads(rget('meaning_hints', game_id=game_id) or '[]')
        if hint not in meaning_hints:
            meaning_hints.append(hint)
        rset('meaning_hints', json.dumps(meaning_hints), game_id=game_id)

    return _process_response({
        'soundsLikeHints': json.loads(rget('sounds_like_hints', game_id=game_id) or '[]'),
        'meaningHints': json.loads(rget('meaning_hints', game_id=game_id) or '[]')
    })


def _get_response_inner(messages: list, game_id: str, leaderboard_name: str) -> str:
    if not compare_digest(request.json.get('password') or '', PASSWORD):
        return _process_response(_failure_response('Wrong password'))
    
    messages_for_openai = [
                {"role": "system", "content": "You are a player in a fun game."},
                {"role": "user", "content": (
                        "Let's play a game. The game is like twenty questions, " 
                        "except that there is no limit on the number of questions asked, "
                        "and the word you're trying to guess is going to be tougher than an ordinary twenty "
                        "questions word."
                    )
                },
                {"role": "assistant", "content": "Sounds fun! Let's play. Have you thought of a word?"},
                {"role": "user", "content": f"Yes, please go ahead and start! Please ask me a question about my word!"},
                *[message[1] for message in [*messages[:10], *messages[-30:]]],
            ]
    
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages_for_openai,
        temperature=1.0,
        n=3,
    )

    new_questions = [choice['message']['content'] for choice in response['choices']]

    goal_word = rget('goal_word', game_id=game_id)

    victory = False
    victory_time = None
    winning_question = None

    characters_to_strip = ['?', '.', ',', '!', '"', "'", ':']

    def strip_characters(s):
        for char in characters_to_strip:
            s = s.replace(char, '')
        return s.lower()
    
    for question in new_questions:
        if re.search(r'\b{}\b'.format(strip_characters(goal_word)), strip_characters(question)):
            victory = True
            game_start_time = rget('game_start_time', game_id=game_id)
            if game_start_time is not None:
                victory_time = time.time() - float(game_start_time)
                winning_question = question

    if victory:
        with leaderboard_lock:
            goal_word_type = get_goal_word_type(goal_word or '')
            leaderboard_games = json.loads(rget('leaderboard_games', game_id=None) or '{}')
            games_with_matching_word = leaderboard_games.get(goal_word)
            if games_with_matching_word:
                games_with_matching_word.append([game_id, victory_time])
                games_with_matching_word.sort(key=lambda x: x[1])
            else:
                str_goal_word_type = goal_word_type.value if goal_word_type else ''
                if str_goal_word_type not in leaderboard_games:
                    leaderboard_games[str_goal_word_type] = {}
                if goal_word not in leaderboard_games[str_goal_word_type]:
                    leaderboard_games[str_goal_word_type][goal_word] = []
                leaderboard_games[str_goal_word_type][goal_word].append([game_id, victory_time])
            rset('leaderboard_games', json.dumps(leaderboard_games), game_id=None)

        if leaderboard_name:
            leaderboard_names = json.loads(rget('leaderboard_names', game_id=None) or '{}')
            if leaderboard_names.get(game_id) is None:
                leaderboard_names[game_id] = leaderboard_name
            rset('leaderboard_names', json.dumps(leaderboard_names), game_id=None)

    return _process_response({'success': True, 'victory': victory, 'victoryTime': victory_time, 'winningQuestion': winning_question, 'goalWord': goal_word, 'questions': new_questions, 'leaderboardName': leaderboard_name, 'gameId': game_id})


@app.route('/leaderboard')
@api_endpoint
def get_leaderboard_info():
    goal_word = request.args.get('goalWord')
    # goal_word = request.args.get('goalWord')

    leaderboard_games = json.loads(rget('leaderboard_games', game_id=None) or '{}')
    leaderboard_names = json.loads(rget('leaderboard_names', game_id=None) or '{}')

    if not goal_word:
        try:
            goal_word_type = GoalWordType(request.args.get('goalWordType'))
        except:
            return _process_response('Invalid goal word type')
    else:
        goal_word_type = get_goal_word_type(goal_word)

    leaderboard_games_items = (leaderboard_games.get(goal_word_type.value if goal_word_type else '') or {}).items()

    leaderboard_by_goal_word_type = []

    for key, value in leaderboard_games_items:
        if not value:
            continue
        sorted_value = sorted(value, key=lambda x: float(x[1]))
        leaderboard_by_goal_word_type.append([key, sorted_value[0][0], leaderboard_names.get(sorted_value[0][0]), sorted_value[0][1]])
    if goal_word:
        leaderboard_by_goal_word = (leaderboard_games.get(goal_word_type.value if goal_word_type else '') or {}).get(goal_word) or []
        leaderboard_by_goal_word = [[goal_word, result[0], leaderboard_names.get(result[0]), result[1]] for result in leaderboard_by_goal_word]

    return _process_response({
        'goalWordType': goal_word_type.value if goal_word_type else 'custom',
        'goalWordTypeLeaderboard': sorted(leaderboard_by_goal_word_type, key=lambda x: float(x[3]))[:20], 
        'goalWordLeaderboard': sorted(leaderboard_by_goal_word, key=lambda x: float(x[3]))[:10] if goal_word else []
    })


@app.route('/best_time', methods=['POST', 'OPTIONS'])
@cross_origin()
def get_best_time():
    goal_word = request.json.get('goalWord')

    leaderboard_games = json.loads(rget('leaderboard_games', game_id=None) or '{}')

    if (tmp := get_goal_word_type(goal_word)):
        goal_word_type = tmp.value
    else:
        goal_word_type = ''

    leaderboard = leaderboard_games.get(goal_word_type) or {}

    if goal_word not in leaderboard:
        return _process_response(None)
    else:
        return _process_response(sorted(leaderboard[goal_word], key=lambda x: x[1])[0][1])


@app.route("/questions", methods=['POST', 'OPTIONS'])
@api_endpoint
def get_response():
    # set your API key
    openai.api_key = OPENAI_SECRET_KEY

    # set the endpoint URL
    url = "https://api.openai.com/v1/engines/davinci-codex/completions"

    new_question = request.json.get('newQuestion')
    raw_user_reply = request.json.get('userReply')
    game_id = request.json.get('gameId')
    question_answer_pair_id = request.json.get('questionAnswerPairId')
    leaderboard_name = request.json.get('leaderboardName')

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
        messages.append([question_answer_pair_id, {"role": "assistant", "content": new_question}])
        messages.append([question_answer_pair_id, {"role": "user", "content": process_user_reply(user_reply, sounds_like_hints, meaning_hints)}])
        rset('messages', json.dumps(messages), game_id=game_id)    

    if len(raw_user_reply or '') > 1000 or len(new_question or '') > 1000:
        return _process_response(_failure_response('Input too long'))

    # messages.append({'content': response['choices'][0]['message']['content'], 'role': 'assistant'})

    return _get_response_inner(messages, game_id, leaderboard_name)


@app.route("/questions", methods=['DELETE', 'OPTIONS'])
@api_endpoint
def delete_question():
    # set your API key
    openai.api_key = OPENAI_SECRET_KEY

    # set the endpoint URL
    url = "https://api.openai.com/v1/engines/davinci-codex/completions"

    new_question = request.json.get('newQuestion')
    raw_user_reply = request.json.get('userReply')
    game_id = request.json.get('gameId')
    question_answer_pair_id = request.json.get('questionAnswerPairId')
    leaderboard_name = request.json.get('leaderboardName')
    
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

    messages = json.loads(rget('messages', game_id=game_id) or '[]')
    print(f'messages before: {messages}')
    messages = [message for message in messages if message[0] != question_answer_pair_id]
    print(f'messages after: {messages}')
    rset('messages', json.dumps(messages), game_id=game_id)

    if len(raw_user_reply or '') > 1000 or len(new_question or '') > 1000:
        return _process_response(_failure_response('Input too long'))

    # messages.append({'content': response['choices'][0]['message']['content'], 'role': 'assistant'})

    return _get_response_inner(messages, game_id, leaderboard_name)

@app.route("/questions/edit", methods=['POST', 'OPTIONS'])
@cross_origin()
def edit_question():
    # set your API key
    openai.api_key = OPENAI_SECRET_KEY

    # set the endpoint URL
    url = "https://api.openai.com/v1/engines/davinci-codex/completions"
    game_id = request.json.get('gameId')
    question_answer_pair_id = request.json.get('questionAnswerPairId')

    sounds_like_hints = json.loads(rget('sounds_like_hints', game_id=game_id) or '[]')
    meaning_hints = json.loads(rget('meaning_hints', game_id=game_id) or '[]')
    leaderboard_name = request.json.get('leaderboardName')

    sounds_like_hints_initial_str = (
        f'As a hint, my word sounds similar to the following words: {", ".join(sounds_like_hints)}. ' 
        if sounds_like_hints else ''
    )
    meaning_hints_initial_str = (
        f'As a hint, my word has a meaning related to the following words: {", ".join(meaning_hints)}. ' 
        if meaning_hints else ''
    )

    def invert(s):
        return 'yes' if s == 'no' else 'no' if s == 'yes' else s

    def maybe_adjust_answer(message):
        if message[0] == question_answer_pair_id and message[1]['role'] == 'user':
            message[1]['content'] = invert(message[1]['content'])
        return message

    messages = json.loads(rget('messages', game_id=game_id) or '[]')
    messages = [maybe_adjust_answer(message) for message in messages]
    rset('messages', json.dumps(messages), game_id=game_id)

    # messages.append({'content': response['choices'][0]['message']['content'], 'role': 'assistant'})

    return _get_response_inner(messages, game_id, leaderboard_name)

@app.route('/definitions', methods=['POST', 'OPTIONS'])
@cross_origin()
def definition():
    word = request.json.get('word')
    url = f'https://api.dictionaryapi.dev/api/v2/entries/en/{word}'

    definition = "failed to get definition :("
    try:
        response = requests.get(url).json()[0]
        definition = response['meanings'][0]['definitions'][0]['definition']
    except:
        print(f'failed to get definition for {word}')
    return _process_response(definition)

@app.route("/leaderboard_names", methods=['POST', 'OPTIONS'])
@api_endpoint
def present_leaderboard_name():
    game_id = request.json.get('gameId')
    leaderboard_name = request.json.get('leaderboardName')
    leaderboard_names = json.loads(rget('leaderboard_names', game_id=None) or '{}')
    if leaderboard_names.get(game_id) is None:
        leaderboard_names[game_id] = leaderboard_name
    rset('leaderboard_names', json.dumps(leaderboard_names), game_id=None)

    return _process_response({'success': True})

@app.route("/bc", methods=['POST','OPTIONS'])
@cross_origin()
def evaluate_bc():
    code = request.json.get('bc')

    try:
        return _process_response(bc(code))
    except Exception as e:
        return _process_response(str(e))


@app.route("/bc/functions", methods=['POST','OPTIONS'])
@cross_origin()
def get_bc_functions():
    return _process_response(bc_functions())

# Start the server
if __name__ == '__main__':
    print('app running!')
    app.run(host='0.0.0.0', port=5001 if LOCAL else 5000)
