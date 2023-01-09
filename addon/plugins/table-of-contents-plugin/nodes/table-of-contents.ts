import {
  createEmberNodeSpec,
  createEmberNodeView,
  EmberNodeConfig,
} from '@lblod/ember-rdfa-editor/utils/ember-node';
import { TABLE_OF_CONTENTS_DEFAULT_CONFIG } from '@lblod/ember-rdfa-editor-lblod-plugins/plugins/table-of-contents-plugin/utils/constants';
import { TableOfContentsConfig } from '..';

export const emberNodeConfig: (
  config?: TableOfContentsConfig
) => EmberNodeConfig = (config) => {
  return {
    name: 'table-of-contents',
    componentPath: 'table-of-contents-plugin/ember-nodes/table-of-contents',
    inline: false,
    group: 'table_of_contents',
    atom: true,
    attrs: {
      config: {
        default: config ?? TABLE_OF_CONTENTS_DEFAULT_CONFIG,
      },
    },
    parseDOM: [
      {
        tag: 'div',
        getAttrs(element: HTMLElement) {
          if (
            element.dataset['emberNode'] === 'table-of-contents' ||
            // Ensure backwards compatibility
            element.dataset['inlineComponent'] ===
              'inline-components/table-of-contents' ||
            (element.classList.contains('inline-component') &&
              element.classList.contains('inline-components/table-of-contents'))
          ) {
            return {};
          }
          return false;
        },
      },
    ],
  };
};

export const table_of_contents = (config?: TableOfContentsConfig) =>
  createEmberNodeSpec(emberNodeConfig(config));
export const tableOfContentsView = (config?: TableOfContentsConfig) =>
  createEmberNodeView(emberNodeConfig(config));
