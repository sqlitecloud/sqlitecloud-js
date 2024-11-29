# To Do App
A simple To Do application built with React Native and Expo for iOS and Android. The app uses [SQLite Cloud](https://sqlitecloud.io/) as a database. 

## Features
- Add Tasks: Create new tasks with titles and optional tags.
- Edit Task Status: Update task status when completed.
- Delete Tasks: Remove tasks from your list.
- Dropdown Menu: Select categories for tasks from a predefined list.

## Set Up
After you've cloned the repo create a `.env` file and add your SQLite Cloud connection string. Make sure your connection string includes the name of your database before the api key. If the database name isn't included, you'll get an error when you run the application. 
```bash
DATABASE_URL="<your-connection-string>" 
```

## Installation
```bash
npm install
npm start
```
This command will start expo.

## Usage
Running on Mobile:

Open the Expo Go app on your mobile device.
Scan the QR code displayed in the terminal.
