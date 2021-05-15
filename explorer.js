// eslint-disable-next-line no-unused-vars
class Explorer {
  constructor(goal, obstacles) {
    this._goal = goal;
    this._obstacles = obstacles;
    this._timestep = 2;
    this._intertime = 0.2;
    this._intersteps = this._timestep/ this._intertime;
    this._steeringAngles = [-.4, -.2, .0, .2, .4];
    this._velocities = [0., 1.];
    this._segments = [];
    this._trajectories = [];
  }

  reset() {
    this._segments = [];
    this._trajectories = [];
  }

  iterateLayer(layerNumber) {
    if (layerNumber === 0) {
      const newSegment = new Segment([new State()]);
      this._segments.push([newSegment]);
    }

    this._segments.push([]);
    for (let j=0; j<this._segments[layerNumber].length; ++j) {
      const state = Object.assign({},
          this._segments[layerNumber][j].lastState);

      if (state.isColliding) {
        continue;
      }

      this._steeringAngles.forEach((angle) => {
        this._velocities.forEach((veloctity) => {
          const newSegment = new Segment(
              this.calculateStates(state, angle, veloctity));

          newSegment.prevIdx = j;
          if (newSegment.lastState.isColliding) {
            newSegment.cost = Infinity;
          }

          this._segments[layerNumber+1].push(newSegment);
        });
      });
    }

    return this._segments[layerNumber+1];
  }

  getTrajectories() {
    const lastLayerIdx = this._segments.length - 1;
    for (let i=0; i<this._segments[lastLayerIdx].length; ++i) {
      this._trajectories.push(this.getTrajectoryBacktraceSegment(i));
    }
    this.addCostDistanceToGoal();

    return this._trajectories;
  }

  getTrajectoryBacktraceSegment(index) {
    const lastLayerIdx = this._segments.length - 1;
    const trajectory = new Trajectory();
    let layerIdx = lastLayerIdx;
    let segmentIdx = index;
    while (layerIdx >= 0) {
      const segment = this._segments[layerIdx][segmentIdx];
      trajectory.unshift(segment);
      segmentIdx = segment.prevIdx;
      layerIdx--;
    }
    trajectory.cost = trajectory.lastSegment.cost;

    return trajectory;
  }

  addCostDistanceToGoal() {
    this._trajectories.forEach((trajectory) => {
      const x = this._goal.x - trajectory.lastSegment.lastState.x;
      const y = this._goal.y - trajectory.lastSegment.lastState.y;
      trajectory.cost += Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    });
  }

  getBestTrajectory() {
    let bestCost = Infinity;
    let bestIdx = null;
    this._trajectories.forEach((trajectory, index) => {
      if (trajectory.cost <= bestCost) {
        bestCost = trajectory.cost;
        bestIdx = index;
      }
    });

    return this.getTrajectoryBacktraceSegment(bestIdx);
  }

  isColliding(state) {
    let colliding = false;
    for (const obstacle of this._obstacles) {
      colliding |= obstacle.isColliding(state);
    }
    return colliding;
  }

  calculateStates(initialState, theta, veloctity) {
    const states = [initialState];
    for (let i = 0; i < this._intersteps; i++) {
      const angle = (i+1) / this._intersteps *
          (theta - initialState.theta) + initialState.theta;
      const vel = (i+1) / this._intersteps *
          (veloctity - initialState.v) + initialState.v;

      if (Math.abs(angle) < Number.EPSILON) {
        states.push(this.calculateStraightMove(states[i], vel));
      } else {
        states.push(this.calculateCrookedMove(states[i], angle, vel));
      }
    }
    return states;
  }

  calculateCrookedMove(prevState, theta, veloctity) {
    const newState = Object.assign({}, prevState);
    newState.x += veloctity * this._intertime * Math.cos(prevState.theta);
    newState.y += veloctity * this._intertime * Math.sin(prevState.theta);
    // TODO: figure out how this works!
    newState.theta += 0.1 * theta * veloctity;
    newState.v = veloctity;
    newState.t += this._intertime;
    newState.isColliding |= this.isColliding(newState);

    // Remove initial state since it is already in previous segment
    // states.splice(0, 1);

    return newState;
  }

  calculateStraightMove(prevState, veloctity) {
    const newState = Object.assign({}, prevState);
    newState.x += veloctity * this._intertime;
    newState.v = veloctity;
    newState.t += this._intertime;
    newState.isColliding |= this.isColliding(newState);

    return newState;
  }
}
