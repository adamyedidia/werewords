Make a config.js file and put the following in it:

```const CONFIG = {
    'URL': 'http://127.0.0.1:5001',
};```

Also, make a local_settings.py file and put the following in it:

```OPENAI_SECRET_KEY = "[the secret key]"
PASSWORD = "[the password]"
LOCAL = True```

To deploy, run "deploy" on the box
