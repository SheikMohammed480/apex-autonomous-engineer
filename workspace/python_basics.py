# ============================================================
# PYTHON BASICS - A HANDS-ON PRACTICE FILE
# Run this file:  python python_basics.py
# ============================================================

# ----------------------------------------------------------
# 1. VARIABLES & DATA TYPES
# ----------------------------------------------------------
# A variable is a name that stores a value. No type declaration needed.
name = "Alice"          # str  (text)
age = 25               # int  (whole number)
height = 5.6           # float (decimal number)
is_student = True      # bool  (True / False)
scores = [90, 85, 92]  # list (ordered, changeable collection)

print("=== 1. Variables & Data Types ===")
print("Name:", name)
print("Age:", age)
print("Height:", height)
print("Is student:", is_student)
print("Scores:", scores)
print("Type of name:", type(name))   # <class 'str'>
print("Type of age:", type(age))     # <class 'int'>
print()

# ----------------------------------------------------------
# 2. STRINGS & F-STRINGS
# ----------------------------------------------------------
# f-strings let you embed variables directly inside text.
first = "John"
last = "Doe"
greeting = f"Hello, {first} {last}! You are {age} years old."
print("=== 2. Strings ===")
print(greeting)
print("Upper:", name.upper())      # ALICE
print("Length:", len(name))        # 5
print("Repeated:", "ha" * 3)       # hahaha
print()

# ----------------------------------------------------------
# 3. CONDITIONALS (if / elif / else)
# ----------------------------------------------------------
print("=== 3. Conditionals ===")
score = 85
if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
else:
    print("Grade: F")
print()

# ----------------------------------------------------------
# 4. LOOPS
# ----------------------------------------------------------
print("=== 4a. for loop (counting) ===")
for i in range(5):          # 0, 1, 2, 3, 4
    print("i =", i)

print("\n=== 4b. for loop (over a list) ===")
for s in scores:
    print("score:", s)

print("\n=== 4c. while loop ===")
count = 3
while count > 0:
    print("Countdown:", count)
    count -= 1              # count = count - 1
print("Liftoff!")
print()

# ----------------------------------------------------------
# 5. LISTS (common operations)
# ----------------------------------------------------------
print("=== 5. Lists ===")
fruits = ["apple", "banana", "cherry"]
fruits.append("mango")      # add to end
fruits.remove("banana")     # remove by value
print("Fruits:", fruits)
print("First:", fruits[0])  # index starts at 0
print("Last:", fruits[-1])
print("Count:", len(fruits))
print()

# ----------------------------------------------------------
# 6. FUNCTIONS
# ----------------------------------------------------------
# A function is a reusable block of code.
def add(a, b):
    """Return the sum of a and b."""
    return a + b

def greet(person):
    """Print a greeting."""
    print(f"Hi, {person}!")

print("=== 6. Functions ===")
print("add(3, 4) =", add(3, 4))
greet("Alice")
print()

# ----------------------------------------------------------#
# 7. DICTS (key-value pairs)
# ----------------------------------------------------------
print("=== 7. Dictionaries ===")
person = {"name": "Alice", "age": 25, "city": "Paris"}
print("Person:", person)
print("Name:", person["name"])
person["age"] = 26          # update a value
person["job"] = "Engineer"  # add a new key
print("Updated:", person)
print()

# ----------------------------------------------------------
# 8. A SMALL PRACTICE PROBLEM
# ----------------------------------------------------------
# Write a function that returns the sum of all numbers in a list.
def total(numbers):
    result = 0
    for n in numbers:
        result += n
    return result

print("=== 8. Practice ===")
print("total([1,2,3,4,5]) =", total([1, 2, 3, 4, 5]))
print("total([10, 20]) =", total([10, 20]))
print("\nDone! 🎉")