import { Router, Request, Response } from "express";
import {
  validateCandidateAdditionalFields,
  validateCandidateEducationFields,
  validateCandidateExperienceFields,
  validateCandidateFields,
} from "../../helpers/validation/validation";
import { Candidate } from "../../interfaces/user";
import {
  validateRequestBody,
  validateRequestArrayBody,
} from "../../config/middlewares";
import { neo4jWrapper } from "../../config/neo4jDriver";
import User from "../../models/User";
import { getQueryProps } from "../../helpers/query";
import { Offer } from "../../interfaces/offer";
import {
  getOffer,
  getOffersFromRecords,
} from "../../helpers/converter/offerConverter";
import { getProperties } from "../../helpers/converter/commonConverter";
import { Experience } from "../../interfaces/experience";
import { Education } from "../../interfaces/education";
import { Additional } from "../../interfaces/additional";

const router = Router();

/**
 * @PATCH
 * Modify candidate account information.
 *
 * @path /candidate
 *
 * @contentType application/json
 *
 * @reqParam email: string          User email.
 * @reqParam firstName: string      First name.
 * @reqParam lastName: string       Last name.
 * @reqParam phoneNumber: string    Phone number.
 * @reqParam country: string        Home country.
 * @reqParam linkedin: string       The link to Linkedin.
 * @reqParam avatar: string         The link to avatar or Base64.
 * @reqParam portfolio: string      Portfolio of a candidate.
 * @reqParam bio: string            Short description about candidate.
 *
 * @resParam message: string        Response message.
 * @resParam candidate: Candidate   Response candidate object.
 *
 */
router.patch(
  "/",
  validateRequestBody<Candidate>(validateCandidateFields),
  async (req: Request, res: Response) => {
    const { email, ...candidateData }: Candidate = req.body;
    const _id = req.user!._id.toString();
    const previousEmail = req?.user?.email;

    try {
      await User.findByIdAndUpdate(_id, {
        $set: { email: email },
      });
    } catch (err) {
      return res.status(500).json({ message: err });
    }

    const queryProps = getQueryProps(candidateData);

    // TODO: Handling picture (avatar)
    try {
      const userData = await neo4jWrapper(
        `MATCH (c:Candidate {_id: $_id}) SET c += {${queryProps}} RETURN c`,
        { ...candidateData, _id },
      );

      const candidate: Candidate = getProperties(userData, ["c"], ["_id"])[0].c;
      return res.status(200).json({ message: "Success!", candidate });
    } catch (err) {
      await User.findByIdAndUpdate(_id, { $set: { email: previousEmail } });
      return res.status(500).json({ message: err });
    }
  },
);

/**
 * @GET
 * Return candidate experience information.
 *
 * @path /candidate/experience
 *
 * @contentType application/json
 *
 *
 * @resParam message: string                  Response message.
 * @resParam experience: Array<Experience>    Response array with experience objects.
 *
 */
router.get("/experience", async (req: Request, res: Response) => {
  const _id = req.user!._id.toString();

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_EXPERIENCE]->(e: Experience) RETURN e`,
      { _id },
    );
    const experience: Array<Experience> =
      getProperties(records, ["e"], []).map((exp) => exp.e) || [];

    return res
      .status(200)
      .json({ message: "Success!", experience: experience });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @GET
 * Return candidate education information.
 *
 * @path /candidate/education
 *
 * @contentType application/json
 *
 *
 * @resParam message: string                Response message.
 * @resParam education: Array<Education>    Response array with education objects.
 *
 */
router.get("/education", async (req: Request, res: Response) => {
  const _id = req.user!._id.toString();

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_EDUCATION]->(e: Education) RETURN e`,
      { _id },
    );
    const education: Array<Education> =
      getProperties(records, ["e"], []).map((edu) => edu.e) || [];

    return res.status(200).json({ message: "Success!", education: education });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @GET
 * Return candidate additional information.
 *
 * @path /candidate/additional
 *
 * @contentType application/json
 *
 *
 * @resParam message: string                 Response message.
 * @resParam education: Array<Additional>    Response array with additional objects.
 *
 */
router.get("/additional", async (req: Request, res: Response) => {
  const _id = req.user!._id.toString();

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_ADDITIONAL]->(a: Additional) RETURN a`,
      { _id },
    );
    const additional: Array<Additional> =
      getProperties(records, ["a"], []).map((adi) => adi.a) || [];

    return res
      .status(200)
      .json({ message: "Success!", additional: additional });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @PUT
 * Create/modify candidate experience information.
 *
 * @path /candidate/experience
 *
 * @contentType application/json
 *
 * @reqParam Array<Experience>       Array with experience objects that will be added or updated.
 *
 * {
 *  id: string              Identificator (if the object does not have this property, a new object will be created).
 *  jobTitle: string        Job title.
 *  company: string         Company name.
 *  country: string         Country of work.
 *  from: string            Start date.
 *  to: string              End date.
 *  details: string         Details information.
   }
 *
 *
 * @resParam message: string                  Response message.
 * @resParam experience: Array<Experience>    Response array with experience objects that were added or updated.
 *
 */
router.put(
  "/experience",
  validateRequestArrayBody<Experience>(validateCandidateExperienceFields),
  async (req: Request, res: Response) => {
    const experiences: Array<Experience> = req.body;

    const _id = req.user!._id.toString();

    try {
      const result: Array<Experience> = await Promise.all(
        experiences.map(async (exp) => {
          if (exp.id) {
            const queryProps = getQueryProps(exp);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})-[:HAS_EXPERIENCE]->(e: Experience {id:$id}) SET e += {${queryProps}}
                RETURN e
              `,
              { ...exp, _id },
            );
            const experience: Experience = getProperties(records, ["e"], [])[0]
              ?.e;
            return experience || { id: exp.id, message: "Not found" };
          } else {
            const queryProps = getQueryProps(exp);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})
                CREATE (e: Experience { ${queryProps}, id:randomUUID()})
                MERGE (c)-[:HAS_EXPERIENCE]->(e)
                RETURN e
              `,
              { ...exp, _id },
            );
            const experience: Experience = getProperties(records, ["e"], [])[0]
              ?.e;
            return experience;
          }
        }),
      );

      return res.status(200).json({ message: "Success!", experience: result });
    } catch (err) {
      return res.status(500).json({ message: err });
    }
  },
);

/**
 * @PUT
 * Create/modify candidate education information.
 *
 * @path /candidate/education
 *
 * @contentType application/json
 *
 * @reqParam Array<Education>       Array with education objects that will be added or updated.
 *
 * {
 *  id: string              Identificator (if the object does not have this property, a new object will be created).
 *  school: string          School name.
 *  degree: string          Degree.
 *  name: string            Name.
 *  from: string            Start date.
 *  to: string              End date.
 *  details: string         Details information.
   }
 *
 *
 * @resParam message: string                Response message.
 * @resParam education: Array<Education>    Response array with education objects that were added or updated.
 *
 */
router.put(
  "/education",
  validateRequestArrayBody<Education>(validateCandidateEducationFields),
  async (req: Request, res: Response) => {
    const educations: Array<Education> = req.body;

    const _id = req.user!._id.toString();

    try {
      const result: Array<Education> = await Promise.all(
        educations.map(async (edu) => {
          if (edu.id) {
            const queryProps = getQueryProps(edu);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})-[:HAS_EDUCATION]->(e: Education {id:$id}) SET e += {${queryProps}}
                RETURN e
              `,
              { ...edu, _id },
            );
            const education: Education = getProperties(records, ["e"], [])[0]
              ?.e;
            return education || { id: edu.id, message: "Not found" };
          } else {
            const queryProps = getQueryProps(edu);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})
                CREATE (e: Education { ${queryProps}, id:randomUUID()})
                MERGE (c)-[:HAS_EDUCATION]->(e)
                RETURN e
              `,
              { ...edu, _id },
            );
            const education: Education = getProperties(records, ["e"], [])[0]
              ?.e;
            return education;
          }
        }),
      );

      return res.status(200).json({ message: "Success!", education: result });
    } catch (err) {
      return res.status(500).json({ message: err });
    }
  },
);

/**
 * @PUT
 * Create/modify candidate additional information.
 *
 * @path /candidate/additional
 *
 * @contentType application/json
 *
 * @reqParam Array<Additional>       Array with additional objects that will be added or updated.
 *
 * {
 *  id: string              Identificator (if the object does not have this property, a new object will be created).
 *  title: string           Title.
 *  details: string         Details information.
   }
 *
 *
 * @resParam message: string                  Response message.
 * @resParam additional: Array<Additional>    Response array with additional objects that were added or updated.
 *
 */
router.put(
  "/additional",
  validateRequestArrayBody<Additional>(validateCandidateAdditionalFields),
  async (req: Request, res: Response) => {
    const additionals: Array<Additional> = req.body;

    const _id = req.user!._id.toString();

    try {
      const result: Array<Additional> = await Promise.all(
        additionals.map(async (adi) => {
          if (adi.id) {
            const queryProps = getQueryProps(adi);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})-[:HAS_ADDITIONAL]->(a: Additional {id:$id}) SET a += {${queryProps}}
                RETURN a
              `,
              { ...adi, _id },
            );
            const additional: Additional = getProperties(records, ["a"], [])[0]
              ?.a;
            return additional || { id: adi.id, message: "Not found" };
          } else {
            const queryProps = getQueryProps(adi);
            const records = await neo4jWrapper(
              `MATCH (c:Candidate {_id: $_id})
                CREATE (a: Additional { ${queryProps}, id:randomUUID()})
                MERGE (c)-[:HAS_ADDITIONAL]->(a)
                RETURN a
              `,
              { ...adi, _id },
            );
            const additional: Additional = getProperties(records, ["a"], [])[0]
              ?.a;
            return additional;
          }
        }),
      );

      return res.status(200).json({ message: "Success!", additional: result });
    } catch (err) {
      return res.status(500).json({ message: err });
    }
  },
);
/**
 * @DELETE
 * Delete candidate experience information.
 *
 * @path /candidate/experience/:id/
 *
 * @contentType application/json
 *
 *
 * @resParam message: string        Response message.
 *
 */
router.delete("/experience/:id/", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();
  const id: string = req.params.id;

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_EXPERIENCE]->(e: Experience {id: $id})
      WITH e, e AS exp
      DETACH DELETE e 
      RETURN exp
      `,
      { _id, id },
    );

    const experience: Experience = getProperties(records, ["exp"], [])[0]?.exp;

    if (experience) {
      return res.status(200).json({
        message: "Success!",
      });
    }
    return res.status(200).json({
      message: "Not deleted",
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @DELETE
 * Delete candidate education information.
 *
 * @path /candidate/education/:id/
 *
 * @contentType application/json
 *
 *
 * @resParam message: string        Response message.
 *
 */
router.delete("/education/:id/", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();
  const id: string = req.params.id;

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_EDUCATION]->(e: Education {id: $id})
      WITH e, e AS edu
      DETACH DELETE e 
      RETURN edu
      `,
      { _id, id },
    );

    const education: Education = getProperties(records, ["edu"], [])[0]?.edu;

    if (education) {
      return res.status(200).json({
        message: "Success!",
      });
    }
    return res.status(200).json({
      message: "Not deleted",
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @DELETE
 * Delete candidate additional information.
 *
 * @path /candidate/additional/:id/
 *
 * @contentType application/json
 *
 *
 * @resParam message: string        Response message.
 *
 */
router.delete("/additional/:id/", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();
  const id: string = req.params.id;

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:HAS_ADDITIONAL]->(a: Additional {id: $id})
      WITH a, a AS adi
      DETACH DELETE a 
      RETURN adi
      `,
      { _id, id },
    );

    const additional: Education = getProperties(records, ["adi"], [])[0]?.adi;

    if (additional) {
      return res.status(200).json({
        message: "Success!",
      });
    }
    return res.status(200).json({
      message: "Not deleted",
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

// ========================================Offers========================================

/**
 * @POST
 * Candidate apply for offer.
 *
 * @path /candidate/offer/:id/apply
 *
 * @contentType application/json
 *
 *
 * @resParam message: string        Response message.
 * @resParam offer: Offer           Response offer object.
 *
 */
router.post("/offer/:id/apply", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();
  const id: string = req.params.id;

  try {
    const records = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})
      MATCH (o:Offer {id: $id})
      MERGE (c)-[:APPLIED_FOR {status: "waiting"}]->(o)
      RETURN o
      `,
      { _id, id },
    );
    const offer: Offer = getOffer(records.records[0], "o");
    return res.status(200).json({
      message: "Success!",
      offer,
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @GET
 * Return all offers applied for by candidate.
 *
 * @path /candidate/offer
 *
 * @contentType application/json

 * @resParam message: string        Response message.
 * @resParam offers: {accepted:Array<Offer>, rejected:Array<Offer>, waiting:Array<Offer>}       Response object of grouped offers.
 *
 */
router.get("/offer", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();

  try {
    const recordsOffersAccepted = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:APPLIED_FOR {status: "accepted"}]->(offerAccepted:Offer)
      RETURN offerAccepted
      `,
      { _id },
    );

    const recordsOffersRejected = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:APPLIED_FOR {status: "rejected"}]->(offerRejected:Offer)
      RETURN offerRejected
      `,
      { _id },
    );

    const recordsOffersWaiting = await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[:APPLIED_FOR {status: "waiting"}]->(offerWaiting:Offer)
      RETURN offerWaiting
      `,
      { _id },
    );

    const offersAccepted = getOffersFromRecords(
      recordsOffersAccepted,
      "offerAccepted",
    );

    const offersRejected = getOffersFromRecords(
      recordsOffersRejected,
      "offerRejected",
    );

    const offersWaiting = getOffersFromRecords(
      recordsOffersWaiting,
      "offerWaiting",
    );

    return res.status(200).json({
      message: "Success!",
      offers: {
        accepted: offersAccepted,
        rejected: offersRejected,
        waiting: offersWaiting,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

/**
 * @DELETE
 * Candidate cancel the application.
 *
 * @path /candidate/offer/:id/apply
 *
 * @contentType application/json
 *
 *
 * @resParam message: string        Response message.
 *
 */
router.delete("/offer/:id/apply", async (req: Request, res: Response) => {
  const _id = req?.user?._id.toString();
  const id: string = req.params.id;

  try {
    await neo4jWrapper(
      `MATCH (c:Candidate {_id: $_id})-[r:APPLIED_FOR]->(o:Offer {id: $id})
      DELETE r
      RETURN o
      `,
      { _id, id },
    );

    return res.status(200).json({
      message: "Success!",
    });
  } catch (err) {
    return res.status(500).json({ message: err });
  }
});

export default router;
