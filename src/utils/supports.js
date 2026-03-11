import { satisfies } from 'compare-versions';

import features from '../data/features.json';

import { getCurrentInstance, getCurrentNodeInfo } from './store-utils';

// Non-semver(?) UA string detection
const containPixelfed = /pixelfed/i;
const notContainPixelfed = /^(?!.*pixelfed).*$/i;
const containPleroma = /pleroma/i;
const containAkkoma = /akkoma/i;
const containGTS = /gotosocial/i;
const containChuckya = /chuckya/i;
const platformFeatures = {
  '@mastodon/lists': notContainPixelfed,
  '@mastodon/filters': notContainPixelfed,
  '@mastodon/mentions': notContainPixelfed,
  '@mastodon/trending-hashtags': notContainPixelfed,
  '@mastodon/trending-links': notContainPixelfed,
  '@mastodon/post-bookmark': notContainPixelfed,
  '@mastodon/post-edit': notContainPixelfed,
  '@mastodon/profile-edit': notContainPixelfed,
  '@mastodon/profile-private-note': notContainPixelfed,
  '@mastodon/pinned-posts': notContainPixelfed,
  '@pixelfed/trending': containPixelfed,
  '@pixelfed/home-include-reblogs': containPixelfed,
  '@pixelfed/global-feed': containPixelfed,
  '@pleroma/local-visibility-post': containPleroma,
  '@akkoma/local-visibility-post': containAkkoma,
  '@chuckya/bubble-timeline': containChuckya,
};
// Named features for which support is explicitly expressed by the instance
const advertisedFeatures = {
  '@akkoma/bubble-timeline': 'bubble_timeline',
};

const supportsCache = {};

const semverExtract = /^\d+\.\d+(\.\d+)?/;
const atSoftwareSlashMatch = /^@([a-z]+)\//i;

function supports(feature) {
  try {
    let { version, domain, pleroma } = getCurrentInstance();

    let softwareName = getCurrentNodeInfo()?.software?.name || 'mastodon';

    if (softwareName === 'hometown') {
      // Hometown is a Mastodon fork and inherits its features
      softwareName = 'mastodon';
    }

    const key = `${domain}-${feature}`;
    if (supportsCache[key]) return supportsCache[key];

    if (platformFeatures[feature]) {
      return (supportsCache[key] = platformFeatures[feature].test(version));
    }

    // use Pleroma / Akkoma's advertised feature list to see if a given feature is supported
    if (pleroma) {
      return (supportsCache[key] = pleroma.metadata.features.includes(
        advertisedFeatures[feature],
      ));
    }

    const featureMatch = feature.match(atSoftwareSlashMatch);
    if (!featureMatch) {
      // Only software match, e.g. supports('@mastodon')
      const software = feature.replace(/^@/, '');
      return (supportsCache[key] = softwareName === software);
    }

    const range = features[feature];
    if (!range) return false;

    // '@mastodon/blah' => 'mastodon'
    const featureSoftware = featureMatch[1];

    const doesSoftwareMatch = featureSoftware === softwareName.toLowerCase();
    let satisfiesRange = satisfies(version, range, {
      includePrerelease: true,
      loose: true,
    });
    if (!satisfiesRange) {
      try {
        // E.g. "4.2.1 (compatible; Iceshrimp 2023.12.14-dev-046d237af)" is invalid semver 😅
        // This regex extracts numbers with dots out and tries again
        // Hopefully this doesn't break anything
        satisfiesRange = satisfies(version.match(semverExtract)?.[0], range, {
          includePrerelease: true,
          loose: false,
        });
      } catch (e) {
        // Ignore
      }
    }
    return (supportsCache[key] = doesSoftwareMatch && satisfiesRange);
  } catch (e) {
    return false;
  }
}

export default supports;
