import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export default Cover = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Organize Your</Text>
      <Text style={styles.heading}>Tasks with SQLite</Text>
      <Text>Designed for Happiness, Not Just Productivity.</Text>
      <Text>Enjoy a Stress-free Way to Manage Your Day.</Text>
      <Button
        style={styles.button}
        buttonColor="#6BA2EA"
        textColor="white"
        onPress={() => navigation.navigate('Categories')}
      >
        Get started
      </Button>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 15,
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 40,
    marginBottom: 5,
  },
  button: {
    position: 'absolute',
    bottom: 70,
    right: 20,
  },
});
