import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Card,
  Text,
  Modal,
  Portal,
  Button,
  TextInput,
} from "react-native-paper";
import useCategories from "../hooks/useCategories";

const Categories = ({ navigation }) => {
  const today = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayIndex = today.getDay();
  const monthDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const { moreCategories, addCategory } = useCategories();

  const [newCategory, setNewCategory] = useState("");
  const [visible, setVisible] = React.useState(false);

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  function handleAddCategory() {
    if (newCategory) {
      addCategory(newCategory);
    }
    setNewCategory("");
    hideModal();
  }

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          style={{ backgroundColor: "white", padding: 20 }}
        >
          <TextInput
            style={styles.textInput}
            label="Enter a new category"
            value={newCategory}
            onChangeText={(newCategory) => setNewCategory(newCategory)}
            keyboardType="default"
            activeUnderlineColor="#6ba2ea"
            underlineColor="none"
            activeOutlineColor="#fff"
            outlineColor="none"
          />
          <Button
            style={styles.button}
            buttonColor={styles.button.backgroundColor}
            textColor={styles.button.color}
            onPress={handleAddCategory}
          >
            Add
          </Button>
        </Modal>
      </Portal>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text
          variant="bodyLarge"
          style={[
            styles.content,
            {
              color: "#6b7280",
            },
          ]}
        >
          {days[dayIndex]}
        </Text>
        <Text
          variant="headlineSmall"
          style={[
            styles.content,
            {
              color: "#000",
            },
          ]}
        >
          {monthDate}
        </Text>
        <View style={styles.cardRow}>
          <Card
            style={styles.card}
            onPress={() => navigation.navigate("Tasks")}
            mode="contained"
          >
            <Card.Title
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="inbox-outline"
                  color={styles.icon.color}
                  style={styles.icon}
                />
              )}
            />

            <Text variant="bodyMedium" style={styles.text}>
              Inbox
            </Text>
          </Card>

          {moreCategories.map((category, index) => (
            <Card
              key={index}
              style={styles.card}
              onPress={() => navigation.navigate("Tasks", { category })}
              mode="contained"
            >
              <Card.Title
                left={(props) => (
                  <Avatar.Icon
                    {...props}
                    icon="tag-outline"
                    color={styles.icon.color}
                    style={styles.icon}
                  />
                )}
              />

              <Text variant="bodyMedium" numberOfLines={1} style={styles.text}>
                {category}
              </Text>
            </Card>
          ))}

          <Card style={styles.addCard} onPress={showModal} mode="contained">
            <Card.Title
              left={(props) => (
                <Avatar.Icon
                  {...props}
                  icon="plus-circle-outline"
                  color={styles.addIcon.color}
                  style={styles.addIcon}
                />
              )}
            />

            <Text variant="bodyMedium" style={styles.text}>
              {" "}
            </Text>
          </Card>
        </View>
      </ScrollView>
    </>
  );
};

Categories.title = "Categories";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  content: {
    padding: 10,
  },
  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#cfe2f8",
    margin: 5,
    width: "47%",
  },
  addCard: {
    backgroundColor: "#fff",
    margin: 5,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#6BA2EA",
    width: "47%",
  },
  icon: {
    backgroundColor: "#cfe2f8",
    color: "#6b7280",
  },
  addIcon: {
    backgroundColor: "#fff",
    color: "#6BA2EA",
  },
  text: {
    color: "#6b7280",
    padding: 15,
  },
  button: {
    borderRadius: "none",
    backgroundColor: "#b2cae9",
    color: "#000",
  },
  textInput: {
    backgroundColor: "#f0f5fd",
  },
});

export default Categories;
