import Ajv, { ValidateFunction } from "ajv";
import { Additional } from "../../interfaces/additional";
import { RegisterReq, UpdateCredentialsReq } from "../../interfaces/auth";
import { Education } from "../../interfaces/education";
import { Experience } from "../../interfaces/experience";
import { Offer } from "../../interfaces/offer";
import { Candidate, Recruiter } from "../../interfaces/user";
import {
  emptyStringRegEx,
  passwordRegEx,
  newPasswordRegEx,
  emailRegEx,
  newEmailRegEx,
} from "./regex";

import {
  userFragileProps,
  userBasicProps,
  userAdditionalProps,
  candidateOnlyProps,
  recruiterOnlyProps,
  offerProps,
  userPassword,
  newUserPassword,
  newUserEmail,
  experienceCandidate,
  educationCandidate,
  additionalCandidate,
} from "./validationInterfaces";

const ajv = new Ajv();

ajv.addFormat("password", passwordRegEx);
ajv.addFormat("newPassword", newPasswordRegEx);
ajv.addFormat("email", emailRegEx);
ajv.addFormat("newEmail", newEmailRegEx);
ajv.addFormat("emptyString", emptyStringRegEx);

const validate = <T>(data: T, validation: ValidateFunction) => {
  const result = validation(data);
  return [result, ajv.errorsText(validation.errors)];
};

export const validateRegisterFields = ajv.compile<RegisterReq>({
  properties: {
    ...userFragileProps,
    ...userBasicProps,
  },
  required: ["email", "password", "accountType", "firstName", "lastName"],
  type: "object",
  additionalProperties: false,
});

export const validateUpdateCredentialsFields =
  ajv.compile<UpdateCredentialsReq>({
    properties: {
      ...userPassword,
      ...newUserEmail,
      ...newUserPassword,
    },
    required: ["password"],
    type: "object",
    additionalProperties: false,
  });

export const validateRecruiterFields = ajv.compile<Recruiter>({
  properties: {
    ...userBasicProps,
    ...userAdditionalProps,
    ...recruiterOnlyProps,
  },
  required: ["firstName", "lastName", "phoneNumber", "country"],
  type: "object",
  additionalProperties: false,
});

export const validateCandidateFields = ajv.compile<Candidate>({
  properties: {
    ...userBasicProps,
    ...userAdditionalProps,
    ...candidateOnlyProps,
  },
  required: ["firstName", "lastName", "phoneNumber", "country"],
  type: "object",
  additionalProperties: false,
});

export const validateOfferFields = ajv.compile<Offer>({
  properties: {
    ...offerProps,
  },
  required: ["title", "companyName", "location", "experience", "description"],
  type: "object",
  additionalProperties: false,
  allOf: [
    {
      if: {
        required: ["bottomPayrange"],
      },
      then: {
        required: ["currency", "topPayrange"],
      },
    },
    {
      if: {
        required: ["topPayrange"],
      },
      then: {
        required: ["currency", "bottomPayrange"],
      },
    },
    {
      if: {
        required: ["currency"],
      },
      then: {
        required: ["topPayrange", "bottomPayrange"],
      },
    },
  ],
});

export const validateCandidateExperienceFields = ajv.compile<Experience>({
  properties: {
    ...experienceCandidate,
  },
  required: ["jobTitle", "company", "country", "from", "to"],
  type: "object",
  additionalProperties: false,
});

export const validateCandidateEducationFields = ajv.compile<Education>({
  properties: {
    ...educationCandidate,
  },
  required: ["school", "degree", "name", "from", "to"],
  type: "object",
  additionalProperties: false,
});

export const validateCandidateAdditionalFields = ajv.compile<Additional>({
  properties: {
    ...additionalCandidate,
  },
  required: ["title"],
  type: "object",
  additionalProperties: false,
});

export default validate;
