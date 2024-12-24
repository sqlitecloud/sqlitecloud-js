Refactor 12.23.24
- Added SQLiteCloudClient class and createClient function
- Extracted PubSub from Database to SQLiteCloudClient
- Added fetch, customFetch support and fetchWithAuth
- Added Weblite methods for upload, download, delete, and listDatabases
- Refactored PubSub to be more intuitive and easier to use
- Added FileClient class and methods for file upload and download
- Added SQLiteCloudVectorClient class and methods for upsert and query

Refactor 12.24.14
Scope of work:
- refactor new code to improve code smells and readability
  - Recap progress.
  - write tests for each new class
  - Idenitfy protential issues
  - Plan refactor with psuedo code
  - Implement refactor
  - Test refactor

TODO:
- add error handling and logging
- add tests
- add comments
- add documentation