class Butterfly {
  constructor(model, bounds, speed = 0.5) {
    this.model = model;
    this.bounds = bounds; // {min: {x,y,z}, max: {x,y,z}}
    this.speed = speed;
    this.velocity = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.flapSpeed = 2 + Math.random() * 3; // Individual flap speed
    this.timeOffset = Math.random() * 100;
    
    // Set initial random position and direction
    this.resetTarget();
    this.model.position.copy(this.targetPosition);
  }

  resetTarget() {
    // Random position within bounds
    this.targetPosition.set(
      this.bounds.min.x + Math.random() * (this.bounds.max.x - this.bounds.min.x),
      this.bounds.min.y + Math.random() * (this.bounds.max.y - this.bounds.min.y),
      this.bounds.min.z + Math.random() * (this.bounds.max.z - this.bounds.min.z)
    );
    
    // Random direction vector
    this.velocity.set(
      Math.random() * 2 - 1,
      (Math.random() * 2 - 1) * 0.5, // Less vertical movement
      Math.random() * 2 - 1
    ).normalize().multiplyScalar(this.speed);
    
    // Random time until next direction change
    this.changeDirectionTime = 1 + Math.random() * 3;
  }

  update(deltaTime) {
      this.timeOffset += deltaTime;

      // Flapping animation (assuming your model has animation)
      this.model.mixer.update(deltaTime * this.flapSpeed);

      // idling
      if (0 == this.speed)
          return;
    
    // Update position
    this.model.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Apply some vertical hovering motion
    const hoverAmount = Math.sin(this.timeOffset * 3) * 0.05;
    this.model.position.y += hoverAmount;
    
    // Change direction occasionally
    this.changeDirectionTime -= deltaTime;
    if (this.changeDirectionTime <= 0 || this.isOutOfBounds()) {
      this.resetTarget();
    }
    
    // Orient butterfly to flight direction
    this.orientToDirection();
  }

  isOutOfBounds() {
    return (
      this.model.position.x < this.bounds.min.x ||
      this.model.position.x > this.bounds.max.x ||
      this.model.position.y < this.bounds.min.y ||
      this.model.position.y > this.bounds.max.y ||
      this.model.position.z < this.bounds.min.z ||
      this.model.position.z > this.bounds.max.z
    );
  }

  orientToDirection() {
    if (this.velocity.lengthSq() > 0.0001) {
      // Calculate target quaternion
      const targetQuaternion = new THREE.Quaternion();
      targetQuaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), // Assuming butterfly faces +Z initially
        this.velocity.clone().normalize()
      );
      
      // Add some random fluttering to the rotation
      const flutterAmount = 0.2;
      targetQuaternion.x += (Math.random() * 2 - 1) * flutterAmount;
      targetQuaternion.y += (Math.random() * 2 - 1) * flutterAmount;
      targetQuaternion.normalize();
      
      // Smoothly interpolate to target rotation
      this.model.quaternion.slerp(targetQuaternion, 0.1);
    }
  }
}