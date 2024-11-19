This is an example [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Run the Application

Set the DATABASE_URL environment variable as the SQLite Cloud chinook connection string and then run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
cd android && ./gradlew clean build && cd .. && npm run android

# OR using Yarn
cd android && ./gradlew clean build && cd .. && yarn android
```

### For iOS

```bash
# using npm
cd ios && pod install && cd .. && npm run ios

# OR using Yarn
cd ios && pod install && cd .. && yarn ios
```