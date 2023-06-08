import {
  createEmberNodeSpec,
  createEmberNodeView,
  EmberNodeConfig,
} from '@lblod/ember-rdfa-editor/utils/ember-node';
import {
  DCT,
  EXT,
  XSD,
} from '@lblod/ember-rdfa-editor-lblod-plugins/utils/constants';
import { hasRDFaAttribute } from '@lblod/ember-rdfa-editor-lblod-plugins/utils/namespace';
import { DateOptions } from '..';
import { formatDate, validateDateFormat } from '../utils';
import { PNode } from '@lblod/ember-rdfa-editor';

const emberNodeConfig = (options: DateOptions): EmberNodeConfig => ({
  name: 'date',
  group: 'inline',
  componentPath: 'rdfa-date-plugin/date',
  inline: true,
  selectable: true,
  draggable: false,
  atom: true,
  defining: false,
  attrs: {
    mappingResource: {
      default: null,
    },
    humanReadableDate: {
      default: formatDate(new Date(), options.formats[0].dateFormat),
    },
    value: {},
    format: {
      default: options.formats[0].dateFormat,
    },
    onlyDate: {
      default: true,
    },
    custom: {
      default: false,
    },
    label: {
      default: '',
    },
  },
  leafText: (node: PNode) => {
    const { value, onlyDate, format } = node.attrs;
    const humanReadableDate = value
      ? formatDate(new Date(value), format)
      : onlyDate
      ? options.placeholder.insertDate
      : options.placeholder.insertDateTime;
    return humanReadableDate;
  },
  toDOM: (node) => {
    const { value, onlyDate, format, mappingResource, custom, label } =
      node.attrs;
    const datatype = onlyDate ? XSD('date') : XSD('dateTime');
    let humanReadableDate: string;
    if (value) {
      if (validateDateFormat(format).type === 'ok') {
        humanReadableDate = formatDate(new Date(value), format);
      } else {
        humanReadableDate = 'Ongeldig formaat';
      }
    } else {
      humanReadableDate = (onlyDate as boolean)
        ? options.placeholder.insertDate
        : options.placeholder.insertDateTime;
    }
    const dateAttrs = {
      datatype: datatype.prefixed,
      property: EXT('content').prefixed,
      'data-format': format as string,
      'data-custom': custom ? 'true' : 'false',
      ...(!!value && { content: value as string }),
    };
    if (mappingResource) {
      return [
        'span',
        {
          resource: mappingResource as string,
          typeof: EXT('Mapping').prefixed,
          class: 'date',
          dataLabel: label as string,
        },
        ['span', { property: DCT('type').prefixed, content: 'date' }],
        ['span', dateAttrs, humanReadableDate],
      ];
    } else {
      return ['span', { class: 'date', ...dateAttrs }, humanReadableDate];
    }
  },
  parseDOM: [
    {
      tag: 'span',
      getAttrs: (node: HTMLElement) => {
        if (
          hasRDFaAttribute(node, 'datatype', XSD('date')) ||
          hasRDFaAttribute(node, 'datatype', XSD('dateTime'))
        ) {
          const onlyDate = hasRDFaAttribute(node, 'datatype', XSD('date'));
          return {
            value: node.getAttribute('content') ?? new Date().toISOString(),
            onlyDate,
            format: node.dataset.format,
            custom: node.dataset.custom === 'true',
          };
        }
        return false;
      },
    },
    {
      tag: 'span',
      getAttrs: (node: HTMLElement) => {
        if (hasRDFaAttribute(node, 'typeof', EXT('Mapping'))) {
          const mappingResource = node.getAttribute('resource');
          if (!mappingResource) {
            return false;
          }
          const variableType = [...node.children]
            .find((el) => hasRDFaAttribute(el, 'property', DCT('type')))
            ?.getAttribute('content');
          const datatype = [...node.children]
            .find((el) => hasRDFaAttribute(el, 'property', EXT('content')))
            ?.getAttribute('datatype');
          if (variableType === 'date' && datatype) {
            const onlyDate = !![...node.children].find((el) =>
              hasRDFaAttribute(el, 'datatype', XSD('date'))
            );
            const dateNode = [...node.children].find((el) =>
              hasRDFaAttribute(el, 'property', EXT('content'))
            ) as HTMLElement | undefined;
            let humanReadableDate: string;
            const value =
              dateNode?.getAttribute('content') ?? new Date().toISOString();
            const format = dateNode?.dataset.format;
            if (value && format) {
              if (validateDateFormat(format).type === 'ok') {
                humanReadableDate = formatDate(new Date(value), format);
              } else {
                humanReadableDate = 'Ongeldig formaat';
              }
            } else {
              humanReadableDate = onlyDate
                ? options.placeholder.insertDate
                : options.placeholder.insertDateTime;
            }
            console.log(node);
            const label = node.getAttribute('dataLabel');
            console.log(label);
            return {
              mappingResource,
              onlyDate,
              humanReadableDate,
              value: value,
              format: format,
              custom: dateNode?.dataset.custom === 'true',
              label,
            };
          }
        }
        return false;
      },
    },
  ],
});

export const date = (options: DateOptions) =>
  createEmberNodeSpec(emberNodeConfig(options));
export const dateView = (options: DateOptions) =>
  createEmberNodeView(emberNodeConfig(options));
