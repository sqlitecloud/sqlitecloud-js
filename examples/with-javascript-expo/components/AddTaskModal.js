import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import { TextInput, Button, Modal } from "react-native-paper";
import DropdownMenu from "./DropdownMenu";
import db from "../db/dbConnection";

export default AddTaskModal = ({
  modalVisible,
  addTaskTag,
  setModalVisible,
}) => {
  const [taskTitle, setTaskTitle] = useState("");
  const [tagsList, setTagsList] = useState([]);
  const [selectedTag, setSelectedTag] = useState({});

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleAddTask = () => {
    if (taskTitle.trim()) {
      addTaskTag({ title: taskTitle.trim(), isCompleted: false }, selectedTag);
      setTaskTitle("");
      setSelectedTag({});
      closeModal();
    } else {
      Alert.alert("Please add a new task.");
    }
  };

  const getTags = async () => {
    try {
      const tags = await db.sql("SELECT * FROM tags");
      setTagsList(tags);
    } catch (error) {
      console.error("Error getting tags", error);
    }
  };

  useEffect(() => {
    getTags();
  }, []);

  return (
    <Modal
      style={styles.modalContainer}
      visible={modalVisible}
      onDismiss={closeModal}
    >
      <View>
        <View style={styles.newTaskBox}>
          <TextInput
            mode="flat"
            style={[
              styles.textInput,
              Platform.OS === "web" && {
                boxShadow: "none",
                border: "none",
                outline: "none",
              },
            ]}
            contentStyle={styles.textInputContent}
            underlineColor="transparent"
            activeUnderlineColor="#6BA2EA"
            value={taskTitle}
            onChangeText={setTaskTitle}
            label="Enter a new task"
            keyboardType="default"
          />
        </View>
        <DropdownMenu tagsList={tagsList} setSelectedTag={setSelectedTag} />
        <Button
          style={styles.addTaskButton}
          textColor="black"
          onPress={handleAddTask}
        >
          Add task
        </Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
  },
  newTaskBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "lightgray",
    backgroundColor: "#f0f5fd",
    marginBottom: 10,
  },
  textInput: {
    width: "100%",
    backgroundColor: "transparent",
    height: 50,
  },
  textInputContent: {
    backgroundColor: "transparennt",
    borderWidth: 0,
    paddingLeft: 10,
  },
  button: {
    height: 50,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    alignItems: "flex-start",
    bottom: 180,
    left: -10,
    zIndex: 1,
  },
  addTaskButton: {
    backgroundColor: "#b2cae9",
    marginTop: 10,
  },
});
