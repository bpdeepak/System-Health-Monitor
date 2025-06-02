// frontend/craco.config.js
module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Override transformIgnorePatterns to include axios and chartjs-adapter-date-fns for transpilation
      // This regex tells Jest to ignore node_modules, EXCEPT for 'axios' and 'chartjs-adapter-date-fns'.
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];

      return jestConfig;
    },
  },
};