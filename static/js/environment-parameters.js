function EnvironmentParameters(params) {
  this.params = params || {
    foodAvailability: 0.5,
    predatorDensity: 0.2,
    waterTemperature: 20
  };
}

EnvironmentParameters.prototype.update = function(newParams) {
  Object.assign(this.params, newParams);
};
