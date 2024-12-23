Refactor Summary
- Added SQLiteCloudClient class and createClient function
- Extracted PubSub from Database to SQLiteCloudClient
- Added fetch and fetchWithAuth
- Added Weblite endpoint methods for upload, download, delete, and listDatabases
- Refactored PubSub to be more intuitive and easier to use
- Added FileClient class and methods for file upload and download

TODO: Polish code, add error handling, Write tests