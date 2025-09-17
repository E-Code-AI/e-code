# Monaco Editor Integration Example

This example demonstrates how to integrate Monaco Editor with the E-Code execution backend.

## Features

- Monaco Editor with syntax highlighting
- Code execution via REST API
- Real-time output streaming
- Language selection
- Error handling

## Files

- `index.html` - Complete standalone example
- `README.md` - This documentation

## Setup

1. Start the E-Code backend server:
   ```bash
   npm run dev
   ```

2. Start the executor service:
   ```bash
   cd server/execution
   go run docker-runner.go
   ```

3. Open `index.html` in a web browser

## Usage

1. Select a programming language from the dropdown
2. Write your code in the Monaco Editor
3. Click "Run Code" to execute
4. View the output in the results panel

## API Integration

The example makes HTTP requests to the executor service:

```javascript
const response = await fetch('http://localhost:8080/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'your-api-key'
  },
  body: JSON.stringify({
    code: editorContent,
    language: selectedLanguage
  })
});
```

## Customization

- Modify the `languages` array to support additional programming languages
- Customize the Monaco Editor theme and settings
- Add file upload/download capabilities
- Implement real-time collaboration features
- Add code completion and intellisense

## Production Considerations

- Implement proper authentication
- Add rate limiting
- Use WebSockets for real-time output
- Add error boundary handling
- Implement code saving/loading
- Add user session management