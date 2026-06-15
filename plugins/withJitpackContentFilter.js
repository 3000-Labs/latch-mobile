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
        includeGroupByRegex 'com\\.github\\..*'
        includeGroupByRegex 'org\\.bitbucket\\..*'
      }
    }`;

module.exports = function withJitpackContentFilter(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (cfg.modResults.contents.includes('includeGroupByRegex')) return cfg;
    if (!JITPACK_RE.test(cfg.modResults.contents)) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(JITPACK_RE, FILTERED);
    return cfg;
  });
};
