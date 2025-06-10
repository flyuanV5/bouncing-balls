// Global variables
let balls = [];
const numBalls = 10;
let hexagonAngle = 0;
const hexagonRadius = 200;
const gravity = 0.2;
const friction = 0.99; // Air friction
const elasticity = 0.8; // Bounciness

class Ball {
  constructor(x, y, r, col) {
    this.position = createVector(x, y);
    this.velocity = p5.Vector.random2D().mult(random(2, 5));
    this.acceleration = createVector(0, 0);
    this.radius = r;
    this.mass = r * 0.1; // Mass proportional to radius
    this.color = col;
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acceleration.add(f);
  }

  update() {
    // Apply gravity
    this.applyForce(createVector(0, gravity * this.mass));

    this.velocity.add(this.acceleration);
    this.velocity.mult(friction); // Apply friction
    this.position.add(this.velocity);
    this.acceleration.mult(0); // Reset acceleration
  }

  display() {
    noStroke();
    fill(this.color);
    ellipse(this.position.x, this.position.y, this.radius * 2);
  }

  // Check collision with hexagon sides
  checkHexagonCollision(angleOffset) {
    for (let i = 0; i < 6; i++) {
      let angle1 = TWO_PI / 6 * i + angleOffset;
      let angle2 = TWO_PI / 6 * (i + 1) + angleOffset;
      let x1 = hexagonRadius * cos(angle1);
      let y1 = hexagonRadius * sin(angle1);
      let x2 = hexagonRadius * cos(angle2);
      let y2 = hexagonRadius * sin(angle2);

      // Closest point on line segment to ball
      let lineDir = createVector(x2 - x1, y2 - y1);
      let point1ToBall = p5.Vector.sub(this.position, createVector(x1, y1));
      let t = p5.Vector.dot(point1ToBall, lineDir) / lineDir.magSq();
      t = constrain(t, 0, 1);

      let closestPoint = createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
      let distanceToLine = p5.Vector.dist(this.position, closestPoint);

      if (distanceToLine < this.radius) {
        // Collision detected
        let normal = createVector(y1 - y2, x2 - x1).normalize(); // Perpendicular to the side
        
        // Ensure normal points outwards from the hexagon center if ball is inside
        // This simplified normal might not always be perfect for concave shapes or complex scenarios
        // but for a convex hexagon and balls generally inside, it works.
        // A more robust approach would involve checking if the ball is on the "inside" or "outside" of the line.
        // For simplicity, we assume the ball is trying to exit.

        // Reflect velocity
        let dot = this.velocity.dot(normal);
        this.velocity.sub(p5.Vector.mult(normal, 2 * dot));
        this.velocity.mult(elasticity);

        // Move ball outside the boundary to prevent sticking
        let overlap = this.radius - distanceToLine;
        this.position.add(p5.Vector.mult(normal, overlap * 1.1)); // Move slightly more than overlap
      }
    }
  }

  // Check collision with other balls
  checkBallCollision(otherBall) {
    let distance = p5.Vector.dist(this.position, otherBall.position);
    if (distance < this.radius + otherBall.radius) {
      // Collision detected
      let normal = p5.Vector.sub(otherBall.position, this.position).normalize();
      let relativeVelocity = p5.Vector.sub(otherBall.velocity, this.velocity);
      let dot = relativeVelocity.dot(normal);

      // If balls are moving towards each other
      if (dot > 0) {
        let impulseMagnitude = (-(1 + elasticity) * dot) / (1 / this.mass + 1 / otherBall.mass);
        let impulse = p5.Vector.mult(normal, impulseMagnitude);

        this.velocity.sub(p5.Vector.div(impulse, this.mass));
        otherBall.velocity.add(p5.Vector.div(impulse, otherBall.mass));

        // Prevent sticking by moving balls apart
        let overlap = (this.radius + otherBall.radius) - distance;
        let correction = p5.Vector.mult(normal, overlap / 2);
        this.position.sub(correction);
        otherBall.position.add(correction);
      }
    }
  }
}

function setup() {
  createCanvas(600, 600);
  for (let i = 0; i < numBalls; i++) {
    let r = random(10, 20);
    // Spawn balls near the center, avoiding exact center to prevent initial overlap issues
    let spawnRadius = hexagonRadius * 0.5;
    let angle = random(TWO_PI);
    let distFromCenter = random(spawnRadius);
    let x = width / 2 + cos(angle) * distFromCenter;
    let y = height / 2 + sin(angle) * distFromCenter;
    let col = color(random(100, 255), random(100, 255), random(100, 255), 200);
    balls.push(new Ball(x, y, r, col));
  }
}

function draw() {
  background(50);
  translate(width / 2, height / 2); // Center the coordinate system

  // Rotate hexagon
  hexagonAngle += 0.005; // Slower rotation
  rotate(hexagonAngle);
  drawHexagon();
  
  // Must rotate balls back to world space for physics and collision with hexagon
  // or apply inverse rotation to hexagon vertices for collision check
  // For simplicity, we'll update and check collisions in the rotated space,
  // but this means gravity direction also rotates with the hexagon, which is not intended.
  // A better approach is to keep balls in world space and transform hexagon vertices.

  // --- Corrected approach: Keep balls in world space, transform hexagon for drawing and collision --- 
  // Reset transformations for ball physics and display
  resetMatrix(); 
  translate(width / 2, height / 2); // Re-center for drawing hexagon in its rotated orientation
  rotate(hexagonAngle);
  drawHexagon();
  resetMatrix(); // Back to absolute world coordinates for balls

  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    // Apply forces and update in world space (relative to canvas, not hexagon)
    // To do this, gravity needs to be applied in world space.
    // The ball's position is already in world space (relative to canvas origin).
    
    // Transform ball position to hexagon's local space for collision check
    let ballPosRelativeToHexCenter = p5.Vector.sub(ball.position, createVector(width/2, height/2));
    let ballPosInHexSpace = createVector(
        ballPosRelativeToHexCenter.x * cos(-hexagonAngle) - ballPosRelativeToHexCenter.y * sin(-hexagonAngle),
        ballPosRelativeToHexCenter.x * sin(-hexagonAngle) + ballPosRelativeToHexCenter.y * cos(-hexagonAngle)
    );

    // Create a temporary ball for collision checking in hexagon's local, non-rotated frame
    let tempBallForHexCollision = new Ball(ballPosInHexSpace.x, ballPosInHexSpace.y, ball.radius, ball.color);
    tempBallForHexCollision.velocity = ball.velocity.copy().rotate(-hexagonAngle); // Rotate velocity too
    
    // Check collision with non-rotated hexagon sides (sides are at angle 0)
    tempBallForHexCollision.checkHexagonCollision(0); 

    // Transform velocity back to world space and apply to original ball
    ball.velocity = tempBallForHexCollision.velocity.copy().rotate(hexagonAngle);
    
    // Update original ball's position based on potentially modified velocity
    // The position update itself is done in world space
    ball.update(); // This applies gravity and updates position

    // Ball-to-ball collisions (in world space)
    for (let j = i + 1; j < balls.length; j++) {
      ball.checkBallCollision(balls[j]);
    }
    
    ball.display(); // Display ball in world space
  }
}

function drawHexagon() {
  stroke(255);
  strokeWeight(4);
  noFill();
  beginShape();
  for (let i = 0; i < 6; i++) {
    let angle = TWO_PI / 6 * i;
    let x = hexagonRadius * cos(angle);
    let y = hexagonRadius * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}

// Helper method for Ball class to check hexagon collision (original simpler version, for reference)
// This version assumes the hexagon is static and centered at (0,0) and ball positions are relative to that.
Ball.prototype.checkStaticHexagonCollision = function() {
    for (let i = 0; i < 6; i++) {
      let angle1 = TWO_PI / 6 * i;
      let angle2 = TWO_PI / 6 * (i + 1);
      let x1 = hexagonRadius * cos(angle1);
      let y1 = hexagonRadius * sin(angle1);
      let x2 = hexagonRadius * cos(angle2);
      let y2 = hexagonRadius * sin(angle2);

      let lineDir = createVector(x2 - x1, y2 - y1);
      let point1ToBall = p5.Vector.sub(this.position, createVector(x1, y1)); // Assumes ball position is relative to hexagon center
      let t = p5.Vector.dot(point1ToBall, lineDir) / lineDir.magSq();
      t = constrain(t, 0, 1);

      let closestPoint = createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
      let distanceToLine = p5.Vector.dist(this.position, closestPoint);

      if (distanceToLine < this.radius) {
        let normal = createVector(y1 - y2, x2 - x1).normalize();
        let dot = this.velocity.dot(normal);
        this.velocity.sub(p5.Vector.mult(normal, 2 * dot));
        this.velocity.mult(elasticity);
        let overlap = this.radius - distanceToLine;
        this.position.add(p5.Vector.mult(normal, overlap * 1.05)); 
      }
    }
};


// Redefine checkHexagonCollision for the Ball class to handle rotated hexagon
// This method expects ball's position and velocity to be in WORLD coordinates.
// It transforms the hexagon's vertices to world coordinates for collision checking.
Ball.prototype.checkHexagonCollision = function(hexCenterX, hexCenterY, currentHexAngle) {
    for (let i = 0; i < 6; i++) {
        let angle_v1 = TWO_PI / 6 * i + currentHexAngle;
        let angle_v2 = TWO_PI / 6 * (i + 1) + currentHexAngle;

        // Vertices of the hexagon side in world coordinates
        let v1x = hexCenterX + hexagonRadius * cos(angle_v1);
        let v1y = hexCenterY + hexagonRadius * sin(angle_v1);
        let v2x = hexCenterX + hexagonRadius * cos(angle_v2);
        let v2y = hexCenterY + hexagonRadius * sin(angle_v2);

        // Ball's position is this.position (world coordinates)
        // Closest point on line segment (v1x,v1y)-(v2x,v2y) to ball (this.position.x, this.position.y)
        let lineDir = createVector(v2x - v1x, v2y - v1y);
        let point1ToBall = p5.Vector.sub(this.position, createVector(v1x, v1y));
        let t = p5.Vector.dot(point1ToBall, lineDir) / lineDir.magSq();
        t = constrain(t, 0, 1); // Clamp t to be on the segment

        let closestPointX = v1x + t * (v2x - v1x);
        let closestPointY = v1y + t * (v2y - v1y);
        let closestPtVec = createVector(closestPointX, closestPointY);

        let distanceToLine = p5.Vector.dist(this.position, closestPtVec);

        if (distanceToLine < this.radius) {
            // Collision detected
            // Normal to the hexagon side, pointing outwards from the segment
            let normal = createVector(v1y - v2y, v2x - v1x).normalize(); 
            
            // Ensure normal points away from the ball to push it out
            // This can be tricky. A simpler way is to ensure the ball is moved outside.
            // The reflection logic should be correct if the normal is correct.

            let dot = this.velocity.dot(normal);
            this.velocity.sub(p5.Vector.mult(normal, 2 * dot));
            this.velocity.mult(elasticity);

            // Move ball outside the boundary to prevent sticking
            let overlap = this.radius - distanceToLine;
            // Use the calculated wall normal to push the ball out.
            // This normal should point outwards from the hexagon side.
            this.position.add(p5.Vector.mult(normal, overlap * 1.05)); // Move slightly more than overlap
        }
    }
};

// Corrected draw loop using the new checkHexagonCollision
function draw() {
  background(50);
  
  hexagonAngle += 0.005; 

  // Draw hexagon (rotated)
  push();
  translate(width / 2, height / 2);
  rotate(hexagonAngle);
  drawHexagon(); // drawHexagon draws relative to current transform
  pop();

  // Update and draw balls
  for (let i = 0; i < balls.length; i++) {
    let ball = balls[i];
    ball.update(); // Applies gravity, friction, updates position (all in world space)
    
    // Check collision with the rotated hexagon
    // Pass hexagon's world center and current rotation angle
    ball.checkHexagonCollision(width / 2, height / 2, hexagonAngle);

    // Ball-to-ball collisions (in world space)
    for (let j = i + 1; j < balls.length; j++) {
      ball.checkBallCollision(balls[j]);
    }
    
    ball.display(); // Display ball in world space
  }
}