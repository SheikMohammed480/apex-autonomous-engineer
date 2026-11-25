#!/usr/bin/env python
"""
Face Detection using OpenCV (Haar Cascade)

Detects human faces in an image or live webcam feed and draws
bounding boxes around them.

Requirements:
    pip install opencv-python

Usage:
    # Detect faces in an image file:
    python face_detection.py image.jpg

    # Detect faces from live webcam (press 'q' to quit):
    python face_detection.py
"""

import sys
import cv2


def detect_faces_in_image(image_path: str) -> None:
    """Load an image, detect faces, and display/save the result."""
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print(f"Error: Could not read image '{image_path}'. Check the path.")
        sys.exit(1)

    # Load the pre-trained Haar Cascade classifier for frontal faces
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    if face_cascade.empty():
        print("Error: Failed to load Haar Cascade XML file.")
        sys.exit(1)

    # Convert to grayscale (Haar cascades work on grayscale)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Detect faces
    # scaleFactor: how much the image size is reduced at each scale
    # minNeighbors: how many neighbors each candidate rectangle should have
    # minSize: minimum possible face size
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )

    # Draw bounding boxes around detected faces
    for (x, y, w, h) in faces:
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(
            image,
            "Face",
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 0),
            2,
        )

    # Print result
    print(f"Detected {len(faces)} face(s) in '{image_path}'.")

    # Display the result
    cv2.imshow("Face Detection", image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def detect_faces_from_webcam() -> None:
    """Open the default webcam and detect faces in real time."""
    # Load the pre-trained Haar Cascade classifier
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    if face_cascade.empty():
        print("Error: Failed to load Haar Cascade XML file.")
        sys.exit(1)

    # Open the default camera (0 = first camera)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        sys.exit(1)

    print("Webcam started. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to grab frame.")
            break

        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        # Draw bounding boxes
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(
                frame,
                "Face",
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 255, 0),
                2,
            )

        # Show count in the corner
        cv2.putText(
            frame,
            f"Faces: {len(faces)}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2,
        )

        cv2.imshow("Face Detection (Webcam)", frame)

        # Exit on 'q'
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


def main() -> None:
    if len(sys.argv) > 1:
        # Image file mode
        detect_faces_in_image(sys.argv[1])
    else:
        # Webcam mode
        detect_faces_from_webcam()


if __name__ == "__main__":
    main()