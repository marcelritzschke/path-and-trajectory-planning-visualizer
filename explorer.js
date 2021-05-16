// eslint-disable-next-line no-unused-vars
class Explorer {
  constructor(goal, obstacles) {
    this._goal = goal;
    this._obstacles = obstacles;
    this._wheelBase = 2.62;
    this._timestep = 2.;
    this._intertime = 0.2;
    this._intersteps = this._timestep/ this._intertime;
    this._steeringAngles = [-.6, -.3, .0, .3, .6];
    this._velocities = [.0, 1.];
    this._segments = [];
    this._trajectories = [];
    this._initialState = new State();
  }

  reset() {
    this._segments = [];
    this._trajectories = [];
  }

  setInitialState(initialState) {
    this.initialState = initialState;
  }

  iterateLayer(layerNumber) {
    if (layerNumber === 0) {
      const newSegment = new Segment([this.initialState]);
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

  calculateStates(initialState, steeringAngle, veloctity) {
    const states = [initialState];
    for (let i = 0; i < this._intersteps; i++) {
      const angle = (i+1) / this._intersteps * (steeringAngle -
          initialState.steeringAngle) + initialState.steeringAngle;
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

  /**
   * Calculating the next vehicle state by assuming a single track model.
   * Means the radius of the curve is calculated by r = wheelBase /
   * sin(steeringAngle). The x and y coordinates are then calculated from
   * x = r * cos(wt) and y = r * sin(wt) with w = v / r. The direction change
   * is phi = w * t = v * t / r.
   * @param {State} prevState Used to add up the values
   * @param {number} steeringAngle Steering angle of tire
   * @param {number} veloctity Current constant velocity
   * @return {State}
   */
  calculateCrookedMove(prevState, steeringAngle, veloctity) {
    const r = this._wheelBase / Math.sin(steeringAngle);

    const newState = Object.assign({}, prevState);
    newState.x = r * Math.sin(veloctity * this._intertime / r);
    newState.y = r * Math.cos(veloctity * this._intertime / r) - r;

    // TODO: The following might be merged with the formulas above.
    const res = Utils.rotatePoint(newState.x, newState.y, prevState.angle);
    newState.x = res[0] + prevState.x;
    newState.y = res[1] + prevState.y;

    newState.steeringAngle = steeringAngle;
    newState.angle += -veloctity * this._intertime / r;
    newState.v = veloctity;
    newState.t += this._intertime;
    newState.isColliding |= this.isColliding(newState);

    // Remove initial state since it is already in previous segment
    // states.splice(0, 1);

    return newState;
  }

  calculateStraightMove(prevState, veloctity) {
    const newState = Object.assign({}, prevState);
    newState.x += veloctity * this._intertime * Math.cos(prevState.angle);
    newState.y += veloctity * this._intertime * Math.sin(prevState.angle);

    newState.steeringAngle = 0;
    newState.v = veloctity;
    newState.t += this._intertime;
    newState.isColliding |= this.isColliding(newState);

    return newState;
  }
}
