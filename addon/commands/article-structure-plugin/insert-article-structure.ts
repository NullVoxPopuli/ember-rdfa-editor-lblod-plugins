import { v4 as uuid } from 'uuid';
import process from 'process';
import { PNode, ProseController } from '@lblod/ember-rdfa-editor';
import IntlService from 'ember-intl/services/intl';
import { Command } from 'prosemirror-state';
import { unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import ValidationReport from 'rdf-validate-shacl/src/validation-report';
import { nodesBetween } from '@lblod/ember-rdfa-editor/utils/position-utils';
import { insertHtml } from '@lblod/ember-rdfa-editor/commands/insert-html-command';
import recalculateStructureNumbers from './recalculate-structure-numbers';
import { Structure } from '@lblod/ember-rdfa-editor-lblod-plugins/utils/article-structure-plugin/constants';

export default function insertArticleStructureV2(
  controller: ProseController,
  structureName: string,
  options: {
    structures: Structure[];
    structureTypes: string[];
  },
  report: ValidationReport,
  intlService: IntlService
): Command {
  return (state, dispatch) => {
    const structureToAddIndex = options.structures.findIndex(
      (structure) => structure.title === structureName
    );
    const structureToAdd = unwrap(options.structures[structureToAddIndex]);
    const structureUri = `${structureToAdd.uriBase}${uuid()}`;

    window.process = process;
    const urisNotAllowedToInsert = report.results.map(
      (result) => result.focusNode?.value
    );
    const { selection } = controller.state;
    const filterFunction = ({ node }: { node: PNode }) => {
      const nodeUri = node.attrs['resource'] as string | undefined;
      if (nodeUri && !urisNotAllowedToInsert.includes(nodeUri)) {
        return true;
      }
      return false;
    };
    let resourceToInsert = nodesBetween(
      selection.$from,
      true,
      false,
      filterFunction
    ).next().value;
    if (!resourceToInsert) {
      resourceToInsert = nodesBetween(
        selection.$from,
        true,
        true,
        filterFunction
      ).next().value;
    }
    if (!resourceToInsert) return false;
    let nodeToInsert: { node: PNode; pos: number } | undefined | null;
    if (structureToAdd.insertPredicate) {
      const resourceToInsertUri = resourceToInsert.node.attrs[
        'resource'
      ] as string;
      nodeToInsert = [
        ...controller.datastore
          .match(
            `>${resourceToInsertUri}`,
            `>${structureToAdd.insertPredicate.long}`
          )
          .asPredicateNodeMapping()
          .nodes(),
      ][0];
    } else {
      nodeToInsert = resourceToInsert;
    }
    if (!nodeToInsert) {
      return false;
    }
    if (dispatch) {
      const structureHtml = structureToAdd.template(structureUri, intlService);

      controller.doCommand(
        insertHtml(
          structureHtml,
          nodeToInsert.pos + nodeToInsert.node.nodeSize - 1,
          nodeToInsert.pos + nodeToInsert.node.nodeSize - 1
        )
      );
      const containerNode = unwrap(
        controller.state.doc.nodeAt(nodeToInsert.pos)
      );
      const containerRange = {
        from: nodeToInsert.pos,
        to: nodeToInsert.pos + containerNode.nodeSize,
      };
      controller.doCommand(
        recalculateStructureNumbers(
          controller,
          containerRange,
          structureToAdd,
          options
        )
      );
    }
    return true;
  };
}
