from app.db import get_session
s = get_session("3c28a63c-bf47-4a2c-8b78-177ee0eef34b")
for m in s["messages"]:
    print(f"=== [{m['step_type']}] {m.get('title')} ===")
    print(m['content'])
    print("-" * 50)
