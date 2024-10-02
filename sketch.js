let points = 10;
let length = 25;
let gravity = 0.6;
let flapStrength = -8;
let isFlapping = false;
let maxYSpeed = 10;
let isSticking = false; // Tracks whether the rope is sticking to the mouse

let rope = [];
let ropeOld = [];
let velocities = []; // To store the velocity of each rope point

let pipes = [];
let pipeWidth = 60;
let pipeGap = 200; // Increase the pipe gap for easier gameplay
let pipeSpeed = 3;
let pipeSpacing = 400; // Increase pipe spacing so pipes appear less frequently

let score = 0;
let ballImage; // Variable for storing the image
let originalImageWidth = 388; // Original width of the image
let originalImageHeight = 274; // Original height of the image
let ballImageWidth = 100; // Scaled width for the image (adjusted down)
let ballImageHeight; // Scaled height for the image (will be calculated based on aspect ratio)

let hitboxVisible = false; // Set to true to show the hitbox, false to hide it
let pointsVisible = false; // Variable to control points' visibility
let hitboxScaleFactor = 0.8; // Factor to slightly increase the size of the hitbox

function preload() {
  // Load the ball image from the local directory
  ballImage = loadImage('assets/ball.png'); // Replace with your image file path
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Calculate the scaled height based on the aspect ratio of the original image
  ballImageHeight = ballImageWidth * (originalImageHeight / originalImageWidth);

  let start = createVector(width / 5, height / 2);
  
  // Initialize rope points and velocities
  for (let i = 0; i < points; i++) {
    let point = createVector(start.x + i * length, start.y);
    rope.push(point);
    ropeOld.push(point.copy());
    velocities.push(createVector(0, 0));
  }

  // Generate initial pipes
  for (let i = 0; i < 3; i++) {
    addPipe(width + i * pipeSpacing);
  }
}

function draw() {
  background(255);

  // If the mouse or touch is pressed, make the head of the rope stick to the mouse/touch
  if (isSticking) {
    rope[0] = createVector(mouseX, mouseY); // Stick the head of the rope to the mouse/touch
  } else if (isFlapping) {
    velocities[0].y = flapStrength; // Apply flap force to the first point
    isFlapping = false;
  }

  // Verlet integration for rope physics
  for (let i = 1; i < points; i++) {
    verletIntegrate(rope[i], ropeOld[i], velocities[i]);
    rope[i].y += gravity; // Apply gravity

    // Limit the downward velocity (terminal velocity)
    if (velocities[i].y > maxYSpeed) {
      velocities[i].y = maxYSpeed;
    }
  }

  // Resolve rope constraints
  for (let j = 0; j < 10; j++) {
    for (let i = 0; i < points - 1; i++) {
      let segment = rope[i];
      let nextSegment = rope[i + 1];

      // Maintain distance between rope points
      let toNext = p5.Vector.sub(segment, nextSegment);
      if (toNext.mag() > length) {
        toNext.setMag(length);
        let offset = p5.Vector.sub(segment, nextSegment).sub(toNext);
        nextSegment.add(p5.Vector.div(offset, 2));
        segment.sub(p5.Vector.div(offset, 2));
      }
    }
  }

  // Draw pipes and check for collisions
  for (let i = pipes.length - 1; i >= 0; i--) {
    drawPipe(pipes[i]);

    // Move pipes to the left
    pipes[i].x -= pipeSpeed;

    // Check if pipe is offscreen, then remove it and add a new one
    if (pipes[i].x + pipeWidth < 0) {
      pipes.splice(i, 1);
      addPipe(width);
      score++;
    }

    // Check for collisions between the image and the pipes
    if (checkCollision(pipes[i])) {
      noLoop(); // Stop the game if there's a collision
      textSize(32);
      fill(255, 0, 0);
      text('Game Over', width / 2 - 80, height / 2);
    }
  }

  // Draw the rope
  stroke(255, 0, 0);
  strokeWeight(5);
  noFill();
  beginShape();
  for (let i = 0; i < points; i++) {
    vertex(rope[i].x, rope[i].y);
  }
  endShape();

  // Draw the image as the ball at the end of the rope
  let ball = rope[points - 1];
  image(ballImage, ball.x - ballImageWidth / 2, ball.y - ballImageHeight / 2, ballImageWidth, ballImageHeight); // Adjust image size

  // Toggle visibility of the points' coordinates
  if (pointsVisible) {
    textSize(16);
    fill(0);
    for (let i = 0; i < points; i++) {
      let p = rope[i];
      text(`P${i}: (${nf(p.x, 1, 2)}, ${nf(p.y, 1, 2)})`, p.x + 10, p.y); // Display next to each point
    }
  }

  // Calculate hitbox (bounding box) for the image, scaled by the hitboxScaleFactor
  let scaledWidth = ballImageWidth * hitboxScaleFactor;
  let scaledHeight = ballImageHeight * hitboxScaleFactor;
  let ballLeft = ball.x - scaledWidth / 2;
  let ballRight = ball.x + scaledWidth / 2;
  let ballTop = ball.y - scaledHeight / 2;
  let ballBottom = ball.y + scaledHeight / 2;

  // Draw hitbox (for debugging)
  if (hitboxVisible) {
    stroke(0, 0, 255); // Blue color for hitbox
    noFill();
    rect(ballLeft, ballTop, scaledWidth, scaledHeight); // Draw hitbox around the image
  }

  // Display score
  textSize(32);
  fill(0);
  text('Score: ' + score, 10, 40);
}

// Adds a new pipe with a random gap position
function addPipe(x) {
  let gapY = random(height / 4, 3 * height / 4);
  pipes.push({
    x: x,
    gapY: gapY
  });
}

// Draws a single pipe with a gap
function drawPipe(pipe) {
  fill(0, 255, 0);
  noStroke();
  rect(pipe.x, 0, pipeWidth, pipe.gapY - pipeGap / 2); // Top pipe
  rect(pipe.x, pipe.gapY + pipeGap / 2, pipeWidth, height - (pipe.gapY + pipeGap / 2)); // Bottom pipe
}

// Checks if the image (end of the rope) collides with a pipe using bounding box collision detection
function checkCollision(pipe) {
  let ball = rope[points - 1]; // The image is the last point of the rope

  // Calculate the scaled hitbox for collision detection
  let scaledWidth = ballImageWidth * hitboxScaleFactor;
  let scaledHeight = ballImageHeight * hitboxScaleFactor;
  let ballLeft = ball.x - scaledWidth / 2;
  let ballRight = ball.x + scaledWidth / 2;
  let ballTop = ball.y - scaledHeight / 2;
  let ballBottom = ball.y + scaledHeight / 2;

  // Check if the image (ball) is within the pipe's horizontal bounds
  if (ballRight > pipe.x && ballLeft < pipe.x + pipeWidth) {
    // Check if the image (ball) is hitting the top or bottom part of the pipe
    if (ballTop < pipe.gapY - pipeGap / 2 || ballBottom > pipe.gapY + pipeGap / 2) {
      return true; // Collision detected
    }
  }
  return false; // No collision
}

// Verlet integration with velocities
function verletIntegrate(curPt, prevPt, velocity) {
  let temp = curPt.copy();
  velocity = p5.Vector.sub(curPt, prevPt);
  curPt.add(velocity); // Update the current point with velocity
  prevPt.set(temp); // Store the current position as the previous
}

function mousePressed() {
  isSticking = true; // Start sticking the rope to the mouse
}

function mouseReleased() {
  isSticking = false; // Stop sticking the rope to the mouse
}

function keyPressed() {
  if (key === ' ') {
    isFlapping = true; // Trigger flapping on spacebar press
  } else if (key === 'H' || key === 'h') {
    hitboxVisible = !hitboxVisible; // Toggle hitbox visibility with 'H' key
    pointsVisible = !pointsVisible; // Toggle points' visibility with 'H' key
  }
}

// Touch event handlers for mobile devices
function touchStarted() {
  isSticking = true; // Start sticking the rope to the touch
  return false; // Prevent default touch behavior
}

function touchEnded() {
  isSticking = false; // Stop sticking the rope to the touch
  return false; // Prevent default touch behavior
}
