import { NodeSpec } from '@lblod/ember-rdfa-editor';
import { StructureSpec } from '..';
import {
  constructStructureBodyNodeSpec,
  constructStructureNodeSpec,
  getStructureHeaderAttrs,
} from '../utils/structure';
import { v4 as uuid } from 'uuid';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import { ELI, EXT, SAY, XSD } from '../constants';

const PLACEHOLDERS = {
  title: 'article-structure-plugin.placeholder.article.heading',
  body: 'article-structure-plugin.placeholder.article.body',
};
export const articleSpec: StructureSpec = {
  name: 'article',
  context: ['title_body', 'chapter_body', 'section_body', 'subsection_body'],
  translations: {
    insert: 'article-structure-plugin.insert.article',
    move: {
      up: 'article-structure-plugin.moveUp.article',
      down: 'article-structure-plugin.moveDown.article',
    },
    remove: 'article-structure-plugin.remove.article',
  },
  continuous: true,
  constructor: ({ schema, number, content, intl }) => {
    const numberConverted = number?.toString() ?? '1';
    const node = schema.node(
      `article`,
      { resource: `http://data.lblod.info/articles/${uuid()}` },
      [
        schema.node(
          'article_header',
          { level: 4, number: numberConverted },
          schema.node('placeholder', {
            placeholderText: intl?.t(PLACEHOLDERS.title),
          })
        ),
        schema.node(
          `article_body`,
          {},
          content ??
            schema.node(
              'paragraph',
              {},
              schema.node('placeholder', {
                placeholderText: intl?.t(PLACEHOLDERS.body),
              })
            )
        ),
      ]
    );
    const selectionConfig: {
      relativePos: number;
      type: 'text' | 'node';
    } = content
      ? { relativePos: 5, type: 'text' }
      : { relativePos: 6, type: 'node' };
    return {
      node,
      selectionConfig,
    };
  },
  updateNumber: ({ number, pos, transaction }) => {
    const numberConverted = number.toString();
    return transaction.setNodeAttribute(pos + 1, 'number', numberConverted);
  },
  content: ({ pos, state }) => {
    const node = unwrap(state.doc.nodeAt(pos));
    return node.child(1).content;
  },
};

export const article = constructStructureNodeSpec({
  type: SAY('Article'),
  content: 'article_header article_body',
});

export const article_header: NodeSpec = {
  content: 'text*|placeholder',
  inline: false,
  attrs: {
    number: {
      default: '1',
    },
    property: {
      default: SAY('heading').prefixed,
    },
  },
  toDOM(node) {
    return [
      'h6',
      { property: node.attrs.property as string },
      'Artikel ',
      [
        'span',
        { property: ELI('number').prefixed, datatype: XSD('string').prefixed },
        node.attrs.number,
      ],
      ': ',
      [
        'span',
        {
          property: EXT('title').prefixed,
        },
        0,
      ],
    ];
  },
  parseDOM: [
    {
      tag: 'h6,span',
      getAttrs(element: HTMLElement) {
        const headerAttrs = getStructureHeaderAttrs(element);
        if (headerAttrs) {
          return headerAttrs;
        }
        return false;
      },
      contentElement: `span[property~='${EXT('title').prefixed}'], 
                       span[property~='${EXT('title').full}']`,
    },
  ],
};

export const article_body = constructStructureBodyNodeSpec({
  content: '(paragraph|article_paragraph)+',
});
