-- Drop the table if it exists
DROP TABLE IF EXISTS people;

-- Create the table with 'age' and 'hobby' columns
CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    hobby TEXT NOT NULL
);

-- Insert people with names, ages, and hobbies
INSERT INTO people (name, age, hobby) VALUES 
('Emma Johnson', 28, 'Collecting clouds'),
('Liam Smith', 34, 'Underwater basket weaving'),
('Olivia Williams', 25, 'Professional napping'),
('Noah Brown', 30, 'Chasing rainbows'),
('Ava Jones', 22, 'Time traveling'),
('Ethan Garcia', 27, 'Volcano surfing'),
('Sophia Miller', 31, 'Competitive snail racing'),
('Mason Davis', 29, 'Extreme ironing'),
('Isabella Rodriguez', 35, 'Lava lamp training'),
('Logan Martinez', 24, 'Dinosaur riding'),
('Mia Hernandez', 26, 'Invisible painting'),
('Gionata Mettifogo', 26, 'Startup tickling'),
('Lucas Lopez', 32, 'Astronaut food tasting'),
('Amelia Gonzalez', 33, 'Sandcastle interior designing'),
('Aiden Wilson', 21, 'Ghost tickling'),
('Charlotte Anderson', 38, 'Antique food collecting'),
('Matthew Thomas', 29, 'Whispering to plants'),
('Harper Jackson', 36, 'Bellybutton lint sculpting'),
('Ditto il Foho', 27, 'Cloud shaping'),
('Benjamin Clark', 39, 'Telepathic cooking');

-- Return the number 42 so we can test the query
SELECT 42;
