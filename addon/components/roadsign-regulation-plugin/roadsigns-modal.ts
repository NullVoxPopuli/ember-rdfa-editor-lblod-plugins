import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { getOwner } from '@ember/application';
import { v4 as uuid } from 'uuid';
import { inject as service } from '@ember/service';
import includeInstructions from '../../utils/roadsign-regulation-plugin/includeInstructions';
import {
  NON_ZONAL_URI,
  POTENTIALLY_ZONAL_URI,
  ZONAL_URI,
} from '../../constants';
import RoadsignRegistryService from '@lblod/ember-rdfa-editor-lblod-plugins/services/roadsign-registry';
import { assert } from '@ember/debug';
import { optionMap, unwrap } from '@lblod/ember-rdfa-editor/utils/option';
import Measure from '@lblod/ember-rdfa-editor-lblod-plugins/models/measure';
import { ProseController } from '@lblod/ember-rdfa-editor/core/prosemirror';
import { insertHtml } from '@lblod/ember-rdfa-editor/commands/insert-html-command';

const PAGE_SIZE = 10;
const SIGN_TYPE_URI =
  'https://data.vlaanderen.be/ns/mobiliteit#Verkeersbordconcept';
const ROAD_MARKING_URI =
  'https://data.vlaanderen.be/ns/mobiliteit#Wegmarkeringconcept';
const TRAFFIC_LIGHT_URI =
  'https://data.vlaanderen.be/ns/mobiliteit#Verkeerslichtconcept';
const measureTypes = [SIGN_TYPE_URI, ROAD_MARKING_URI, TRAFFIC_LIGHT_URI];

type Zonality = {
  label: string;
  value: string;
};

type TypeOption = {
  label: string;
  value: string;
};

type Code = {
  label: string;
  value: string;
};

type Category = {
  label: string;
  value: string;
};

type Args = {
  closeModal: () => void;
  controller: ProseController;
};

export default class RoadsignRegulationCard extends Component<Args> {
  endpoint: string;

  pageSize = PAGE_SIZE;
  @service declare roadsignRegistry: RoadsignRegistryService;

  @tracked typeSelected?: TypeOption;

  @tracked categorySelected?: Category;

  @tracked zonalityOptions: Zonality[] = [
    {
      label: 'Zonaal',
      value: ZONAL_URI,
    },
    {
      label: 'Niet zonaal',
      value: NON_ZONAL_URI,
    },
  ];
  @tracked zonalitySelected?: Zonality;

  descriptionFilter?: string;

  @tracked selectedCode?: Code;
  @tracked selectedCodeCombination?: Code[];
  @tracked codeCombinationOptions: Code[] = [];
  @tracked tableData: Measure[] = [];
  @tracked count?: number;
  @tracked pageStart = 0;

  get isNotTypeSign() {
    if (!this.typeSelected) return true;
    return this.typeSelected.value !== SIGN_TYPE_URI;
  }

  constructor(parent: unknown, args: Args) {
    super(parent, args);
    const config = getOwner(this)!.resolveRegistration(
      'config:environment'
    ) as {
      roadsignRegulationPlugin: {
        endpoint: string;
      };
    };
    this.endpoint = config.roadsignRegulationPlugin.endpoint;
    this.search();
  }

  @action
  selectTypeOrCategory(option: { label: string; value: string }) {
    if (!option) {
      this.typeSelected = undefined;
      this.categorySelected = undefined;
    } else {
      if (measureTypes.includes(option.value)) {
        this.typeSelected = option;
        this.categorySelected = undefined;
      } else {
        this.typeSelected = undefined;
        this.categorySelected = option;
      }
    }
    this.selectedCode = undefined;
    this.selectedCodeCombination = undefined;
    this.search();
  }

  @action
  changeCode(value: Code) {
    this.selectedCode = value;
    this.selectedCodeCombination = undefined;
    void this.fetchCodeCombinations();
    this.search();
  }

  @action
  changeCodeCombination(value: Code[]) {
    this.selectedCodeCombination = value;
    void this.fetchCodeCombinations();
    this.search();
  }

  @action
  changeDescription(event: InputEvent) {
    assert(
      'changeDescriptionValue must be bound to an input element',
      event.target instanceof HTMLInputElement
    );
    this.descriptionFilter = event.target.value;
    this.search();
  }

  @action
  selectCategory(value: Category) {
    this.categorySelected = value;
    this.search();
  }

  @action
  selectZonality(value: Zonality) {
    this.zonalitySelected = value;
    this.search();
  }

  @action
  closeModal() {
    this.args.closeModal();
  }
  @action
  searchCodes(term: string) {
    const category = this.categorySelected?.value;
    const type = this.typeSelected?.value;
    return this.roadsignRegistry.searchCode.perform(term, category, type);
  }

  async fetchCodeCombinations() {
    const selectedCodeValue = unwrap(this.selectedCode?.value);
    let signs: string[] = [selectedCodeValue];
    if (this.selectedCodeCombination) {
      signs = [
        selectedCodeValue,
        ...this.selectedCodeCombination.map((s) => s.value),
      ];
    }
    const codes = await this.roadsignRegistry.searchCode.perform(
      undefined,
      undefined,
      undefined,
      signs
    );
    this.codeCombinationOptions = codes;
  }

  get typeOptions(): {
    groupName: string;
    options: TypeOption[];
  }[] {
    return [
      {
        groupName: 'Types',
        options: [
          {
            label: 'Verkeersborden',
            value: SIGN_TYPE_URI,
          },
          {
            label: 'Wegmarkeringen',
            value:
              'https://data.vlaanderen.be/ns/mobiliteit#Wegmarkeringconcept',
          },
          {
            label: 'Verkeerslichten',
            value:
              'https://data.vlaanderen.be/ns/mobiliteit#Verkeerslichtconcept',
          },
        ],
      },
      {
        groupName: 'Categorieën',
        options: this.roadsignRegistry.classifications,
      },
    ];
  }

  fetchSigns = task({ restartable: true }, async () => {
    const codes: Code[] = [];
    if (this.selectedCodeCombination) {
      codes.push(...this.selectedCodeCombination);
    }
    if (this.selectedCode) {
      codes.push(this.selectedCode);
    }
    const { measures, count } =
      await this.roadsignRegistry.fetchMeasures.perform({
        zonality: this.zonalitySelected
          ? this.zonalitySelected.value
          : undefined,
        type: this.typeSelected ? this.typeSelected.value : undefined,
        codes: codes.length ? codes.map((code) => code.value) : undefined,
        category: this.categorySelected
          ? this.categorySelected.value
          : undefined,
        pageStart: this.pageStart,
      });
    this.tableData = measures;
    this.count = count;
  });

  get insertRange() {
    const selection = this.args.controller.state.selection;
    const besluit = [
      ...this.args.controller.datastore
        .limitToRange(this.args.controller.state, selection.from, selection.to)
        .match(undefined, 'a', '>http://data.vlaanderen.be/ns/besluit#Besluit')
        .asSubjectNodeMapping(),
    ][0];
    const besluitNode = [...(besluit?.nodes ?? [])][0];

    if (besluitNode) {
      const { pos: resolvedPos, node } = besluitNode;
      let insertRange: { from: number; to: number } | undefined;
      const basePos = resolvedPos ? resolvedPos.pos + 1 : 0;
      node.descendants((child, childPos) => {
        if (child.attrs['property'] === 'prov:value') {
          insertRange = {
            from: basePos + childPos + child.nodeSize - 1,
            to: basePos + childPos + child.nodeSize - 1,
          };
        }
        return false;
      });
      return insertRange;
    }
  }

  @action
  async insertHtml(
    measure: Measure,
    zonalityValue: string,
    temporalValue: string
  ) {
    const instructions =
      await this.roadsignRegistry.fetchInstructionsForMeasure.perform(
        measure.uri
      );
    const zonality = zonalityValue ? zonalityValue : measure.zonality;
    const html = includeInstructions(
      measure.annotatedTemplate,
      instructions,
      true
    );
    const signsHTML = measure.signs
      .map((sign) => {
        const roadSignUri = 'http://data.lblod.info/verkeerstekens/' + uuid();
        return `<li style="margin-bottom:1rem;">
        <span property="mobiliteit:wordtAangeduidDoor" resource=${roadSignUri} typeof="mobiliteit:Verkeersbord-Verkeersteken">
        <span property="mobiliteit:heeftVerkeersbordconcept" resource="${
          sign.uri
        }" typeof="mobiliteit:Verkeersbordconcept" style="display:flex;align-items:center;">
          <span property="skos:prefLabel" style="padding-bottom:0;margin-left:0;margin-right:.4rem;">${
            sign.code
          }</span>
          <span style="margin-left:0;margin-top:0;">${
            sign.zonality === POTENTIALLY_ZONAL_URI && zonality === ZONAL_URI
              ? 'met zonale geldigheid'
              : ''
          }
          </span>
          </span>
        </span>
      </li>`;
      })
      .join('\n');
    // TODO: Import insert structure from article structure command
    // const InsertStructure = (
    //   _structureType: string,
    //   _htmlContent: string
    // ): Command => {
    //   return (_state, _dispatch) => true;
    // };

    if (this.insertRange) {
      this.args.controller.doCommand(
        insertHtml(
          `<div property="mobiliteit:heeftVerkeersmaatregel" typeof="mobiliteit:Mobiliteitsmaatregel" resource="http://data.lblod.info/mobiliteitsmaatregels/${uuid()}">
            <span style="display:none;" property="prov:wasDerivedFrom" resource="${
              measure.uri
            }">&nbsp;</span>
            <span style="display:none;" property="ext:zonality" resource="${zonality}"></span>
            <span style="display:none;" property="ext:temporal" value="${measure.temporal.toString()}"></span>
              <div property="dct:description">
                ${html}
                <p>Dit wordt aangeduid door verkeerstekens:</p>
                <ul style="list-style:none;">
                  ${signsHTML}
                </ul>
                ${
                  temporalValue === 'true'
                    ? 'Deze signalisatie is dynamisch.'
                    : ''
                }
              </div>
            </div>
          `,
          this.insertRange.from,
          this.insertRange.to
        )
      );
    }
    this.args.closeModal();
  }

  @action
  goToPage(pageStart: number) {
    this.pageStart = pageStart;
    void this.fetchSigns.perform();
  }
  @action
  search() {
    this.pageStart = 0;
    void this.fetchSigns.perform();
  }
}
