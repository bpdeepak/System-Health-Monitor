// frontend/craco.config.js
module.exports = {
  jest: {
    configure: (jestConfig) => {
      // Ensure transformIgnorePatterns is still set correctly for axios and chartjs-adapter-date-fns
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];

      // ADD THIS SECTION: Configure Jest to mock CSS files
      jestConfig.moduleNameMapper = {
        "\\.css$": "<rootDir>/__mocks__/styleMock.js"
      };

      return jestConfig;
    },
  },
};