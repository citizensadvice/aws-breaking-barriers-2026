from mcp.server.fastmcp import FastMCP
from dynamodb_manager import NotesManager

mcp = FastMCP(host="0.0.0.0", stateless_http=True)
notes_manager = NotesManager()

@mcp.tool()
def add_note(user_id: str, content: str, category: str = "general") -> str:
    """Save a note for the user. Categories: benefits, housing, employment, consumer, debt, other"""
    result = notes_manager.add_note(user_id, content, category)
    return f"Note saved: {result['noteId']}"

@mcp.tool()
def get_notes(user_id: str, category: str = None) -> str:
    """Get all notes for a user, optionally filtered by category"""
    notes = notes_manager.get_notes(user_id, category)
    return str(notes)

@mcp.tool()
def delete_note(user_id: str, note_id: str) -> str:
    """Delete a specific note"""
    notes_manager.delete_note(user_id, note_id)
    return "Note deleted"

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
