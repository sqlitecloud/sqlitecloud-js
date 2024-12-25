Refactor 12.23.24
- Added SQLiteCloudClient class and createClient function
- Extracted PubSub from Database to SQLiteCloudClient
- Added fetch, customFetch support and fetchWithAuth
- Added Weblite methods for upload, download, delete, and listDatabases
- Refactored PubSub to be more intuitive and easier to use
- Added FileClient class and methods for file upload and download
- Added SQLiteCloudVectorClient class and methods for upsert and query

Refactor Summary
- The Plan: 
  - Improve the usability of the SQLite Cloud platform by consolidating various features 
    under a single client with one consistent design and interface
The Objective:
  - Provide a streamlined and consistent api for discovering, learning and using features on SQLite Cloud
  - Improve the visibility of various features on the SQLite Cloud platform by providing explicit namespaces and methods for:
    - functions
    - file storage
    - Pub/Sub
    - Vector search
    - Weblite (platform-level database management)
    - database (core database connection)
  - Increase adoption of SQLite Cloud's JS SDK by expanding our documentation.
  - Provide a solid architecture for future SDK development.
  - Goals:
    - Streamline the onboarding and implementation process for building JS apps on SQLite Cloud

Guidelines:
  - Use consistent and scalable designs to improve readability, usability and maintainability.

Scope of work:
- refactor new code to improve code smells and readability
  - Recap progress.
    - packages
     - functions:
      - Purpose: used to interact with edge functions deployed on the SQLite Cloud platform
      - Value: removes need for custom client
      - Objective: simplify the onboarding and use of edge functions to increase adoption
    - storage:
      - Purpose: used to store files, with an emphasis on images and photos
      - Value: unifies development experience of handling transactional and non-transactional data
      - Objective: simplify the development process 
    - pubsub:
      - Purpose: used to interact with the SQLite Cloud pubsub platform
      - Value: removes need for custom client
      - Objective: simplify the onboarding and use of pubsub to increase adoption
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


Out of scope:
- Auth module (awaiting auth.js merge)
- Vector search module