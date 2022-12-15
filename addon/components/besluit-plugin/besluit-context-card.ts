import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { ProseController } from '@lblod/ember-rdfa-editor/core/prosemirror';
import { VariableType } from '../../utils/variable-plugins/default-variable-types';
import { action } from '@ember/object';
import { recalculateArticleNumbers } from '@lblod/ember-rdfa-editor-lblod-plugins/commands/recalculate-article-numbers-command';
import { moveArticleCommand } from '@lblod/ember-rdfa-editor-lblod-plugins/commands/move-article-command';

type Args = {
  controller: ProseController;
  widgetArgs: {
    options: {
      publisher: string;
      variableTypes: (VariableType | string)[];
      defaultEndpoint: string;
    };
  };
};

export default class BesluitContextCardComponent extends Component<Args> {
  @tracked articleElement: any;
  @tracked besluitUri: string;

  constructor(parent: unknown, args: Args) {
    super(parent, args);
  }

  get controller() {
    return this.args.controller;
  }

  @action
  deleteArticle() {
    const { from, to } = this.controller.state.selection;

    const limitedDatastore = this.controller.datastore.limitToRange(
      this.controller.state,
      from,
      to
    );
    const articleNode = [
      ...limitedDatastore
        .match(null, 'a', '>http://data.vlaanderen.be/ns/besluit#Artikel')
        .asSubjectNodeMapping()
        .nodes(),
    ][0];
    if (!articleNode?.pos) {
      return;
    }
  }

  @action
  moveUpArticle() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    moveArticleCommand(
      this.controller,
      this.besluitUri,
      this.articleElement,
      true
    );
  }

  @action
  moveDownArticle() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    moveArticleCommand(
      this.controller,
      this.besluitUri,
      this.articleElement,
      false
    );
  }

  @action
  selectionChangedHandler() {
    this.articleElement = undefined;
    const { from, to } = this.controller.state.selection;

    const limitedDatastore = this.controller.datastore.limitToRange(
      this.controller.state,
      from,
      to
    );
    const articleNode = [
      ...limitedDatastore
        .match(null, 'a', '>http://data.vlaanderen.be/ns/besluit#Artikel')
        .asSubjectNodeMapping()
        .nodes(),
    ][0];
    this.articleElement = articleNode;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    this.besluitUri = articleNode?.node.attrs['resource'] || '';
  }
}
