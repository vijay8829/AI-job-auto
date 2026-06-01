# OpenAI removed — all AI features use the built-in pure-code engine.
# Stub kept so legacy imports don't break at startup.

def get_openai_client():
    raise RuntimeError(
        "OpenAI has been removed. Resume parsing, matching, and generation "
        "now use the built-in code-based engine in app/services/parser/."
    )
