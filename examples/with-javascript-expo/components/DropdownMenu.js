import React from "react";
import { View, StyleSheet } from "react-native";
import RNPickerSelect from "react-native-picker-select";

export default DropdownMenu = ({ tagsList, selectedTag, setSelectedTag }) => {
  const TAGS = tagsList.map((tag) => {
    return { label: tag.name, value: tag.name };
  });

  const getTagId = (value) => {
    const tagId = tagsList.filter((tag) => {
      return tag.name === value;
    });
    return tagId[0]?.id;
  };

  return (
    <View style={styles.container}>
      <RNPickerSelect
        items={TAGS}
        onValueChange={(value) =>
          setSelectedTag({ id: getTagId(value), name: value })
        }
        placeholder={{ label: "Select a category", value: null }}
        value={selectedTag}
        style={pickerSelectStyles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderColor: "lightgray",
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: "#f0f5fd",
    marginBottom: 10,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    height: 50,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "lightgray",
    borderRadius: 4,
    color: "black",
    backgroundColor: "#f0f5fd",
    paddingRight: 30,
  },
  inputAndroid: {
    height: 50,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "lightgray",
    borderRadius: 4,
    color: "black",
    backgroundColor: "#f0f5fd",
    paddingRight: 30,
  },
});
