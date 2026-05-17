# KURA MCP Client

A Model Context Protocol (MCP) client that enables Claude Desktop to interact with KURA Notes API. This standalone client provides semantic search, note creation, retrieval, and management capabilities through Claude's native interface.

## Features

- **Semantic Search**: Find relevant notes using natural language queries
- **Note Creation**: Create text notes with metadata (title, tags, annotations)
- **Note Retrieval**: Get specific notes by ID or list recent notes
- **Note Management**: Delete notes when needed
- **Robust Error Handling**: Clear error messages for API issues
- **Logging**: Detailed logging to stderr for debugging

## Prerequisites

- Node.js >= 20.0.0
- Claude Desktop application
- KURA Notes API access (API key required)

## Installation

1. **Clone or download this repository**:
   ```bash
   git clone <repository-url>
   cd kura-mcp-client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

   This will:
   - Compile TypeScript to JavaScript
   - Generate the `dist/index.js` file
   - Make the output file executable

## Configuration

### For Claude Desktop

Add the following configuration to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kura-notes": {
      "command": "node",
      "args": ["/absolute/path/to/kura-mcp-client/dist/index.js"],
      "env": {
        "API_KEY": "your-kura-api-key-here",
        "KURA_API_URL": "https://kura.tillmaessen.de"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/kura-mcp-client` with the actual absolute path to this project directory.

### Environment Variables

- `API_KEY` (required): Your KURA Notes API authentication key
- `KURA_API_URL` (optional): The KURA API base URL (defaults to `https://kura.tillmaessen.de`)

## Available Tools

### 1. `kura_search`

Perform semantic search across your KURA Notes.

**Parameters**:
- `query` (string, required): The search query
- `limit` (number, optional): Maximum number of results (default: 10)
- `contentType` (string, optional): Filter by content type (e.g., "text")
- `tags` (string, optional): Comma-separated tags to filter by

**Example**:
```
Search my notes for "machine learning algorithms"
```

**Response**: Array of search results with relevance scores and metadata.

### 2. `kura_create`

Create a new text note in KURA Notes.

**Parameters**:
- `content` (string, required): The main content of the note
- `title` (string, optional): Title for the note
- `annotation` (string, optional): Additional context or annotation
- `tags` (array of strings, optional): Tags to categorize the note

**Example**:
```
Create a note with the content "Today I learned about semantic search"
and tag it with "learning" and "ai"
```

**Response**: Created note with ID and metadata.

### 3. `kura_get`

Retrieve a specific note by its ID.

**Parameters**:
- `id` (string, required): The unique identifier of the note

**Example**:
```
Get the note with ID "abc123"
```

**Response**: Full note content and metadata, or error if not found.

### 4. `kura_list_recent`

List the 20 most recent notes with metadata (without full content).

**Parameters**: None

**Example**:
```
Show me my recent notes
```

**Response**: Array of recent notes with metadata.

### 5. `kura_delete`

Delete a note by its ID. This action is permanent.

**Parameters**:
- `id` (string, required): The unique identifier of the note to delete

**Example**:
```
Delete the note with ID "abc123"
```

**Response**: Success confirmation or error if not found.

## Usage Examples

Once configured in Claude Desktop, you can use natural language to interact with your KURA Notes:

1. **Search for notes**:
   - "Search my KURA notes for information about TypeScript"
   - "Find notes tagged with 'project-ideas'"

2. **Create notes**:
   - "Create a note: 'Meeting notes from today's standup...'"
   - "Save this idea to KURA: 'Build a note-taking MCP client'"

3. **Retrieve notes**:
   - "Get the full content of note ID xyz789"
   - "Show me my recent notes"

4. **Delete notes**:
   - "Delete note abc123"

## Troubleshooting

### Server not starting

**Symptom**: Claude Desktop shows connection error

**Solutions**:
- Verify Node.js version: `node --version` (should be >= 20.0.0)
- Check the absolute path in `claude_desktop_config.json` is correct
- Ensure the project is built: `npm run build`
- Check that `dist/index.js` exists and is executable

### API_KEY error

**Symptom**: "ERROR: API_KEY environment variable is required"

**Solutions**:
- Verify `API_KEY` is set in the `env` section of your Claude Desktop config
- Restart Claude Desktop after changing the config
- Check for typos in the config file

### Authentication errors

**Symptom**: "401 Unauthorized" or "403 Forbidden" errors

**Solutions**:
- Verify your API key is correct and active
- Check if the API key has the necessary permissions
- Ensure the `Authorization` header format is correct

### Network errors

**Symptom**: "Failed to fetch" or connection timeout errors

**Solutions**:
- Verify `KURA_API_URL` is correct and accessible
- Check your internet connection
- Verify the KURA API service is running

### Viewing logs

The MCP client logs to stderr. To view logs:

**macOS/Linux**:
1. Close Claude Desktop
2. Run from terminal:
   ```bash
   /Applications/Claude.app/Contents/MacOS/Claude 2>&1 | grep "KURA MCP"
   ```

**Windows**:
Check the Claude Desktop logs in the application data directory.

## Development

### Project Structure

```
kura-mcp-client/
├── README.md           # This file
├── package.json        # Project configuration and dependencies
├── tsconfig.json       # TypeScript compiler configuration
├── .gitignore          # Git ignore rules
├── src/
│   └── index.ts        # Main MCP server implementation
└── dist/
    └── index.js        # Compiled JavaScript (after build)
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the project (compile TypeScript)
npm run build

# Run in development mode (with hot reload)
npm run dev

# Clean build artifacts
npm run clean

# Rebuild from scratch
npm run clean && npm run build
```

### Running Tests Manually

You can test the MCP server manually:

```bash
# Set environment variables
export API_KEY="your-api-key"
export KURA_API_URL="https://kura.tillmaessen.de"

# Run the server (it will wait for MCP protocol messages on stdin)
node dist/index.js
```

The server communicates via JSON-RPC over stdin/stdout, so manual testing requires sending properly formatted MCP protocol messages.

### Code Structure

The main implementation in `src/index.ts` includes:

- **TypeScript Interfaces**: Type definitions for KURA API responses
- **Environment Validation**: Checks for required API_KEY
- **callKuraAPI()**: Helper function for authenticated API requests
- **MCP Server Setup**: Initializes the MCP server with stdio transport
- **Tool Definitions**: Defines the 5 available tools with schemas
- **Request Handlers**:
  - `ListToolsRequestSchema`: Returns available tools
  - `CallToolRequestSchema`: Executes tool calls with error handling

### Adding New Tools

To add new tools:

1. Add the tool definition to the `tools` array
2. Add a new case in the `CallToolRequestSchema` handler
3. Implement the API call and response handling
4. Update this README with the new tool documentation

## API Reference

The client interacts with these KURA Notes API endpoints:

- `GET /api/search` - Semantic search
- `POST /api/capture` - Create notes
- `GET /api/content/{id}` - Get specific note
- `GET /api/content/recent` - List recent notes
- `DELETE /api/content/{id}` - Delete note

All requests include `Authorization: Bearer {API_KEY}` header.

## Technical Details

- **Protocol**: Model Context Protocol (MCP) via stdio
- **Transport**: JSON-RPC over stdin/stdout
- **Language**: TypeScript compiled to ES2022
- **Runtime**: Node.js >= 20.0.0
- **SDK**: @modelcontextprotocol/sdk v1.x

## License

Please reer to LICENSE

## Contributing

Contributions are welcome! Please ensure:

- TypeScript code follows the existing style
- All tools have proper error handling
- Documentation is updated for new features
- Code compiles without errors

## Support

For issues related to:
- **This MCP client**: Check the troubleshooting section above
- **KURA Notes API**: Contact your KURA API administrator
- **Claude Desktop**: Visit [Anthropic's support](https://support.anthropic.com)
- **MCP Protocol**: See [MCP documentation](https://github.com/modelcontextprotocol/specification)
