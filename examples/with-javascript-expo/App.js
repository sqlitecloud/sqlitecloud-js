import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Cover from "./screens/Cover";
import Home from "./screens/Home";
import AddTaskModal from "./components/AddTaskModal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Categories from './screens/Categories';

export default function App() {
  const Stack = createStackNavigator();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <PaperProvider>
          <Stack.Navigator>
            <Stack.Screen name="Cover" component={Cover} />
            <Stack.Screen name="Categories" component={Categories} />
            <Stack.Screen name="Tasks" component={Home} />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="Add Task" component={AddTaskModal} />
            </Stack.Group>
          </Stack.Navigator>
        </PaperProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
