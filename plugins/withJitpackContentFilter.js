const { withProjectBuildGradle } = require('@expo/config-plugins');

// JitPack only hosts com.github.* / org.bitbucket.* style coordinates. Without a
// content filter, Gradle also queries JitPack for Maven Central artifacts when
// resolving dynamic version ranges (e.g. expo-updates -> bouncycastle
// bcprov-jdk15to18:[1.81,1.82)). JitPack is slow/flaky and times out, failing the
// whole resolution. Restricting it here keeps it out of that path.
const JITPACK_RE = /maven\s*\{\s*url\s*['"]https:\/\/(?:www\.)?jitpack\.io\/?['"]\s*\}/;

const FILTERED = `maven {
      url 'https://www.jitpack.io'
      content {
        includeGroupByRegex 'com\\\\.github\\\\..*'
        includeGroupByRegex 'org\\\\.bitbucket\\\\..*'
      }
    }`;

// Safety net independent of the content filter: pin the bouncycastle artifact that
// expo-updates pulls via a dynamic range so Gradle never performs a maven-metadata
// version listing (the request that times out against JitPack). An exact version
// resolves straight from Maven Central with a single artifact lookup.
const PIN_MARKER = '// latch:pin-bouncycastle';
const PIN_BLOCK = `
${PIN_MARKER}
allprojects {
  configurations.all {
    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'org.bouncycastle' && details.requested.name == 'bcprov-jdk15to18') {
        details.useVersion '1.81'
        details.because 'Avoid dynamic-range metadata lookup that hits flaky JitPack (Latch)'
      }
    }
  }
}
`;

module.exports = function withJitpackContentFilter(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;
    if (!contents.includes('includeGroupByRegex') && JITPACK_RE.test(contents)) {
      contents = contents.replace(JITPACK_RE, FILTERED);
    }
    if (!contents.includes(PIN_MARKER)) {
      contents += PIN_BLOCK;
    }
    cfg.modResults.contents = contents;
    return cfg;
  });
};
