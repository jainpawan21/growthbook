import React, { useState, useEffect } from "react";
import {
  condToJson,
  jsonToConds,
  useAttributeMap,
  useAttributeSchema,
} from "../../services/features";
import Field from "../Forms/Field";
import styles from "./ConditionInput.module.scss";
import { GBAddCircle } from "../Icons";
import SelectField from "../Forms/SelectField";
import { useDefinitions } from "../../services/DefinitionsContext";
import CodeTextArea from "../Forms/CodeTextArea";
import { DocLink } from "../DocLink";

interface Props {
  defaultValue: string;
  onChange: (value: string) => void;
}

export default function ConditionInput(props: Props) {
  const { savedGroups } = useDefinitions();

  const attributes = useAttributeMap();

  // Manually adding the current_datetime attribute
  attributes.set("current_datetime", {
    archived: false,
    array: false,
    attribute: "current_datetime",
    datatype: "date",
    enum: [],
    identifier: false,
  });

  const [advanced, setAdvanced] = useState(
    () => jsonToConds(props.defaultValue, attributes) === null
  );
  const [simpleAllowed, setSimpleAllowed] = useState(false);
  const [displayedDateTime, setDisplayedDateTime] = useState("");
  const [value, setValue] = useState(props.defaultValue);
  const [conds, setConds] = useState(() =>
    jsonToConds(props.defaultValue, attributes)
  );

  const attributeSchema = useAttributeSchema();

  const index = attributeSchema.findIndex(
    (attribute) => attribute.property === "current_datetime"
  );

  // Manually add current_datetime if it's not in the attributeSchema
  if (index === -1) {
    attributeSchema.push({
      property: "current_datetime",
      datatype: "date",
    });
  }

  useEffect(() => {
    if (advanced) return;
    setValue(condToJson(conds, attributes));
  }, [advanced, conds]);

  useEffect(() => {
    props.onChange(value);
    setSimpleAllowed(jsonToConds(value, attributes) !== null);
  }, [value, attributes]);

  const savedGroupOperators = [
    {
      label: "is in the saved group",
      value: "$inGroup",
    },
    {
      label: "is not in the saved group",
      value: "$notInGroup",
    },
  ];

  if (advanced || !attributes.size || !simpleAllowed) {
    return (
      <div className="mb-3">
        <CodeTextArea
          label="Targeting Conditions"
          language="json"
          value={value}
          setValue={setValue}
          helpText={
            <div className="d-flex">
              <div>JSON format using MongoDB query syntax.</div>
              {simpleAllowed && attributes.size && (
                <div className="ml-auto">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const newConds = jsonToConds(value, attributes);
                      // TODO: show error
                      if (newConds === null) return;
                      setConds(newConds);
                      setAdvanced(false);
                    }}
                  >
                    switch to simple mode
                  </a>
                </div>
              )}
            </div>
          }
        />
      </div>
    );
  }

  if (!conds.length) {
    return (
      <div className="form-group">
        <label className="mb-0">Targeting Conditions</label>
        <div className="m-2">
          <em className="text-muted mr-3">Applied to everyone by default.</em>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const prop = attributeSchema[0];
              setConds([
                {
                  field: prop?.property || "",
                  operator: prop?.datatype === "boolean" ? "$true" : "$eq",
                  value: "",
                },
              ]);
            }}
          >
            Add targeting condition
          </a>
        </div>
      </div>
    );
  }

  const getLocalDateTime = (rawDateTime: string) => {
    if (!rawDateTime) {
      return "";
    }
    const utcDateTime = new Date(parseInt(rawDateTime) || rawDateTime);

    // We need to adjust for timezone/daylight savings time before converting to ISO String to pass into datetime-local field
    utcDateTime.setHours(
      utcDateTime.getHours() -
        new Date(parseInt(rawDateTime) || rawDateTime).getTimezoneOffset() / 60
    );
    return utcDateTime.toISOString().substring(0, 16);
  };

  return (
    <div className="form-group">
      <label>Targeting Conditions</label>
      <div className={`mb-3 bg-light px-3 pb-3 ${styles.conditionbox}`}>
        <ul className={styles.conditionslist}>
          {conds.map(({ field, operator, value }, i) => {
            const attribute = attributes.get(field);

            const savedGroupOptions = savedGroups
              // First, limit to groups with the correct attribute
              .filter((g) => g.attributeKey === field)
              // Then, transform into the select option format
              .map((g) => ({ label: g.groupName, value: g.id }));

            const onChange = (
              e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
            ) => {
              const name = e.target.name;
              let value: string | number = e.target.value;

              // If this is an incoming date, we need to update displayedDateTime and then convert to epoch before updating conds
              if (e.target.type === "datetime-local" && value) {
                setDisplayedDateTime(value);
                const updatedValue = new Date(value).valueOf();
                value = updatedValue;
              }

              const newConds = [...conds];
              newConds[i] = { ...newConds[i] };
              newConds[i][name] = value;
              setConds(newConds);
            };

            const onSelectFieldChange = (value: string, name: string) => {
              const newConds = [...conds];
              newConds[i] = { ...newConds[i] };
              newConds[i][name] = value;
              setConds(newConds);
            };

            const operatorOptions =
              attribute.datatype === "date"
                ? [
                    { label: "is before", value: "$lt" },
                    { label: "is after", value: "$gt" },
                  ]
                : attribute.datatype === "boolean"
                ? [
                    { label: "is true", value: "$true" },
                    { label: "is false", value: "$false" },
                    { label: "exists", value: "$exists" },
                    { label: "does not exist", value: "$notExists" },
                  ]
                : attribute.array
                ? [
                    { label: "includes", value: "$includes" },
                    { label: "does not include", value: "$notIncludes" },
                    { label: "is empty", value: "$empty" },
                    { label: "is not empty", value: "$notEmpty" },
                    { label: "exists", value: "$exists" },
                    { label: "does not exist", value: "$notExists" },
                  ]
                : attribute.enum?.length > 0
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "exists", value: "$exists" },
                    { label: "does not exist", value: "$notExists" },
                  ]
                : attribute.datatype === "string"
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "matches regex", value: "$regex" },
                    { label: "does not match regex", value: "$notRegex" },
                    { label: "is greater than", value: "$gt" },
                    { label: "is greater than or equal to", value: "$gte" },
                    { label: "is less than", value: "$lt" },
                    { label: "is less than or equal to", value: "$lte" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "exists", value: "$exists" },
                    { label: "does not exist", value: "$notExists" },
                    ...(savedGroupOptions.length > 0
                      ? savedGroupOperators
                      : []),
                  ]
                : attribute.datatype === "number"
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "is greater than", value: "$gt" },
                    { label: "is greater than or equal to", value: "$gte" },
                    { label: "is less than", value: "$lt" },
                    { label: "is less than or equal to", value: "$lte" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "exists", value: "$exists" },
                    { label: "does not exist", value: "$notExists" },
                    ...(savedGroupOptions.length > 0
                      ? savedGroupOperators
                      : []),
                  ]
                : [];

            return (
              <li key={i} className={styles.listitem}>
                <div className={`row ${styles.listrow}`}>
                  {i > 0 ? (
                    <span className={`${styles.and} mr-2`}>AND</span>
                  ) : (
                    <span className={`${styles.and} mr-2`}>IF</span>
                  )}
                  <div className="col-sm-12 col-md mb-2">
                    <SelectField
                      value={field}
                      options={attributeSchema.map((s) => ({
                        label: s.property,
                        value: s.property,
                      }))}
                      name="field"
                      className={`${styles.firstselect} form-control`}
                      onChange={(value) => {
                        const newConds = [...conds];
                        newConds[i] = { ...newConds[i] };
                        newConds[i]["field"] = value;

                        const newAttribute = attributes.get(value);
                        if (newAttribute.datatype !== attribute.datatype) {
                          if (newAttribute.datatype === "boolean") {
                            newConds[i]["operator"] = "$true";
                          } else {
                            newConds[i]["operator"] = "$eq";
                            newConds[i]["value"] = newConds[i]["value"] || "";
                          }
                        }
                        setConds(newConds);
                      }}
                    />
                  </div>
                  <div className="col-sm-12 col-md mb-2">
                    <SelectField
                      value={operator}
                      name="operator"
                      options={operatorOptions}
                      onChange={(v) => {
                        onSelectFieldChange(v, "operator");
                      }}
                      className="form-control"
                    />
                  </div>
                  {[
                    "$exists",
                    "$notExists",
                    "$true",
                    "$false",
                    "$empty",
                    "$notEmpty",
                  ].includes(operator) ? (
                    ""
                  ) : ["$inGroup", "$notInGroup"].includes(operator) &&
                    savedGroups ? (
                    <SelectField
                      options={savedGroupOptions}
                      value={value}
                      onChange={(v) => {
                        onSelectFieldChange(v, "value");
                      }}
                      name="value"
                      initialOption="Choose group..."
                      containerClassName="col-sm-12 col-md mb-2"
                    />
                  ) : ["$in", "$nin"].includes(operator) ? (
                    <Field
                      textarea
                      value={value}
                      onChange={onChange}
                      name="value"
                      minRows={1}
                      className={styles.matchingInput}
                      containerClassName="col-sm-12 col-md mb-2"
                      helpText="separate values by comma"
                    />
                  ) : attribute.enum.length ? (
                    <SelectField
                      options={attribute.enum.map((v) => ({
                        label: v,
                        value: v,
                      }))}
                      value={value}
                      onChange={(v) => {
                        onSelectFieldChange(v, "value");
                      }}
                      name="value"
                      initialOption="Choose One..."
                      containerClassName="col-sm-12 col-md mb-2"
                    />
                  ) : attribute.datatype === "number" ? (
                    <Field
                      type="number"
                      step="any"
                      value={value}
                      onChange={onChange}
                      name="value"
                      className={styles.matchingInput}
                      containerClassName="col-sm-12 col-md mb-2"
                    />
                  ) : attribute.datatype === "string" ? (
                    <Field
                      value={value}
                      onChange={onChange}
                      name="value"
                      className={styles.matchingInput}
                      containerClassName="col-sm-12 col-md mb-2"
                    />
                  ) : attribute.datatype === "date" ? (
                    <div>
                      <Field
                        type="datetime-local"
                        value={displayedDateTime || getLocalDateTime(value)}
                        onChange={onChange}
                        name="value"
                        className={styles.matchingInput}
                        containerClassName="col-sm-12 col-md mb-2"
                      />
                      {getLocalDateTime(value) && (
                        <span
                          className="pl-2 font-italic font-weight-light"
                          style={{ fontSize: "12px" }}
                        >
                          Time displayed in{" "}
                          {new Date(getLocalDateTime(value))
                            .toLocaleDateString(undefined, {
                              day: "2-digit",
                              timeZoneName: "short",
                            })
                            .substring(4)}
                        </span>
                      )}
                    </div>
                  ) : (
                    ""
                  )}
                  <div className="col-md-auto col-sm-12">
                    <button
                      className="btn btn-link text-danger float-right"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const newConds = [...conds];
                        newConds.splice(i, 1);
                        setConds(newConds);
                      }}
                    >
                      remove
                    </button>
                  </div>
                </div>
                {field === "current_datetime" && (
                  <div className="alert alert-warning mt-2 mb-2">
                    Feature rules based on date/time are only available with
                    certain SDKs.{" "}
                    <DocLink docSection={"targeting_attributes"}>
                      View Docs
                    </DocLink>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="d-flex align-items-center">
          {attributeSchema.length > 0 && (
            <a
              className={`mr-3 btn btn-outline-primary ${styles.addcondition}`}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const prop = attributeSchema[0];
                setConds([
                  ...conds,
                  {
                    field: prop?.property || "",
                    operator: prop?.datatype === "boolean" ? "$true" : "$eq",
                    value: "",
                  },
                ]);
              }}
            >
              <span
                className={`h4 pr-2 m-0 d-inline-block align-top ${styles.addicon}`}
              >
                <GBAddCircle />
              </span>
              Add another condition
            </a>
          )}
          <a
            href="#"
            className="ml-auto"
            style={{ fontSize: "0.9em" }}
            onClick={(e) => {
              e.preventDefault();
              setAdvanced(true);
            }}
          >
            Advanced mode
          </a>
        </div>
      </div>
    </div>
  );
}
