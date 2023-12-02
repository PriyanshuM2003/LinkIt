const express = require("express");
const mongoose = require("mongoose");
const jwtAuth = require("../lib/jwtAuth");
const User = require("../db/User");
const Plan = require("../db/Plan");
const JobApplicant = require("../db/JobApplicant");
const Recruiter = require("../db/Recruiter");
const Job = require("../db/Job");
const Application = require("../db/Application");
const Rating = require("../db/Rating");
const { sendEmail } = require("../lib/mailer");
const Razorpay = require("razorpay");

const router = express.Router();

// To add new job
router.post("/jobs", jwtAuth, (req, res) => {
  const user = req.user;

  if (user.type != "recruiter") {
    // applicant trying to add new job
    // not authorised
    res.status(401).json({
      message: "You don't have permissions to add jobs",
    });
    return;
  }

  const data = req.body;

  let job = new Job({
    userId: user._id,
    title: data.title,
    maxApplicants: data.maxApplicants,
    maxPositions: data.maxPositions,
    dateOfPosting: data.dateOfPosting,
    deadline: data.deadline,
    skillsets: data.skillsets,
    jobType: data.jobType,
    duration: data.duration,
    salary: data.salary,
    rating: data.rating,
  });

  job
    .save()
    .then(() => {
      res.json({ message: "Job added successfully to the database" });
    })
    .catch((err) => {
      //Whenever any user sends an invalid request to the server,
      //the server immediately reports it and generates an HTTP based 400 bad request error.
      res.status(400).json(err);
    });
});

// to get all the jobs [pagination] [for recruiter personal and for everyone]
router.get("/jobs", jwtAuth, (req, res) => {
  let user = req.user;

  let findParams = {};
  let sortParams = {};

  // to list down jobs posted by a particular recruiter
  if (user.type === "recruiter" && req.query.myjobs) {
    findParams = {
      ...findParams,
      userId: user._id,
    };
  }

  if (req.query.q) {
    findParams = {
      ...findParams,
      title: {
        $regex: new RegExp(req.query.q, "i"),
      },
    };
  }

  if (req.query.jobType) {
    let jobTypes = [];
    if (Array.isArray(req.query.jobType)) {
      jobTypes = req.query.jobType;
    } else {
      jobTypes = [req.query.jobType];
    }
    console.log(jobTypes);
    findParams = {
      ...findParams,
      jobType: {
        $in: jobTypes,
      },
    };
  }

  if (req.query.salaryMin && req.query.salaryMax) {
    findParams = {
      ...findParams,
      $and: [
        {
          salary: {
            $gte: parseInt(req.query.salaryMin),
          },
        },
        {
          salary: {
            $lte: parseInt(req.query.salaryMax),
          },
        },
      ],
    };
  } else if (req.query.salaryMin) {
    findParams = {
      ...findParams,
      salary: {
        $gte: parseInt(req.query.salaryMin),
      },
    };
  } else if (req.query.salaryMax) {
    findParams = {
      ...findParams,
      salary: {
        $lte: parseInt(req.query.salaryMax),
      },
    };
  }

  if (req.query.duration) {
    findParams = {
      ...findParams,
      duration: {
        $lt: parseInt(req.query.duration),
      },
    };
  }

  if (req.query.asc) {
    if (Array.isArray(req.query.asc)) {
      req.query.asc.map((key) => {
        sortParams = {
          ...sortParams,
          [key]: 1,
        };
      });
    } else {
      sortParams = {
        ...sortParams,
        [req.query.asc]: 1,
      };
    }
  }

  if (req.query.desc) {
    if (Array.isArray(req.query.desc)) {
      req.query.desc.map((key) => {
        sortParams = {
          ...sortParams,
          [key]: -1,
        };
      });
    } else {
      sortParams = {
        ...sortParams,
        [req.query.desc]: -1,
      };
    }
  }

  console.log(findParams);
  console.log(sortParams);

  // Job.find(findParams).collation({ locale: "en" }).sort(sortParams);
  // .skip(skip)
  // .limit(limit)

  let arr = [
    {
      $lookup: {
        from: "recruiterinfos",
        localField: "userId",
        foreignField: "userId",
        as: "recruiter",
      },
    },
    { $unwind: "$recruiter" },
    { $match: findParams },
  ];

  if (Object.keys(sortParams).length > 0) {
    arr = [
      {
        $lookup: {
          from: "recruiterinfos",
          localField: "userId",
          foreignField: "userId",
          as: "recruiter",
        },
      },
      { $unwind: "$recruiter" },
      { $match: findParams },
      {
        $sort: sortParams,
      },
    ];
  }

  console.log(arr);

  Job.aggregate(arr)
    .then((posts) => {
      if (posts == null) {
        res.status(404).json({
          message: "No job found",
        });
        return;
      }
      res.json(posts);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to get info about a particular job
router.get("/jobs/:id", jwtAuth, (req, res) => {
  Job.findOne({ _id: req.params.id })
    .then((job) => {
      if (job == null) {
        res.status(400).json({
          message: "Job does not exist",
        });
        return;
      }
      res.json(job);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to update info of a particular job
router.put("/jobs/:id", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    // 401- unauthorised
    res.status(401).json({
      message: "You don't have permissions to change the job details",
    });
    return;
  }
  Job.findOne({
    _id: req.params.id,
    userId: user.id,
  })
    .then((job) => {
      if (job == null) {
        // 404 - not found
        res.status(404).json({
          message: "Job does not exist",
        });
        return;
      }
      const data = req.body;
      if (data.maxApplicants) {
        job.maxApplicants = data.maxApplicants;
      }
      if (data.maxPositions) {
        job.maxPositions = data.maxPositions;
      }
      if (data.deadline) {
        job.deadline = data.deadline;
      }
      job
        .save()
        .then(() => {
          res.json({
            message: "Job details updated successfully",
          });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// to delete a job
router.delete("/jobs/:id", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to delete the job",
    });
    return;
  }
  Job.findOneAndDelete({
    _id: req.params.id,
    userId: user.id,
  })
    .then((job) => {
      if (job === null) {
        res.status(401).json({
          message: "You don't have permissions to delete the job",
        });
        return;
      }
      res.json({
        message: "Job deleted successfully",
      });
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// get user's personal details
router.get("/user", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    Recruiter.findOne({ userId: user._id })
      .then((recruiter) => {
        if (recruiter == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(recruiter);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    JobApplicant.findOne({ userId: user._id })
      .then((jobApplicant) => {
        if (jobApplicant == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        res.json(jobApplicant);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// get user details from id
router.get("/user/:id", jwtAuth, (req, res) => {
  User.findOne({ _id: req.params.id })
    .then((userData) => {
      if (userData === null) {
        res.status(404).json({
          message: "User does not exist",
        });
        return;
      }

      if (userData.type === "recruiter") {
        Recruiter.findOne({ userId: userData._id })
          .then((recruiter) => {
            if (recruiter === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(recruiter);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      } else {
        JobApplicant.findOne({ userId: userData._id })
          .then((jobApplicant) => {
            if (jobApplicant === null) {
              res.status(404).json({
                message: "User does not exist",
              });
              return;
            }
            res.json(jobApplicant);
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      }
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// update user details
router.put("/user", jwtAuth, (req, res) => {
  const user = req.user;
  const data = req.body;
  if (user.type == "recruiter") {
    Recruiter.findOne({ userId: user._id })
      .then((recruiter) => {
        if (recruiter == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        if (data.companyName) {
          recruiter.companyName = data.companyName;
        }
        if (data.contactNumber) {
          recruiter.contactNumber = data.contactNumber;
        }
        if (data.bio) {
          recruiter.bio = data.bio;
        }
        recruiter
          .save()
          .then(() => {
            res.json({
              message: "User information updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    JobApplicant.findOne({ userId: user._id })
      .then((jobApplicant) => {
        if (jobApplicant == null) {
          res.status(404).json({
            message: "User does not exist",
          });
          return;
        }
        if (data.name) {
          jobApplicant.name = data.name;
        }
        if (data.education) {
          jobApplicant.education = data.education;
        }
        if (data.skills) {
          jobApplicant.skills = data.skills;
        }
        if (data.resume) {
          jobApplicant.resume = data.resume;
        }
        if (data.profile) {
          jobApplicant.profile = data.profile;
        }
        console.log(jobApplicant);
        jobApplicant
          .save()
          .then(() => {
            res.json({
              message: "User information updated successfully",
            });
          })
          .catch((err) => {
            res.status(400).json(err);
          });
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// apply for a job [todo: test: done]
router.post("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "applicant") {
    res.status(401).json({
      message: "You don't have permissions to apply for a job",
    });
    return;
  }
  const data = req.body;
  const jobId = req.params.id;

  // check whether applied previously
  // find job
  // check count of active applications < limit
  // check user had < 10 active applications && check if user is not having any accepted jobs (user id)
  // store the data in applications

  Application.findOne({
    userId: user._id,
    jobId: jobId,
    status: {
      $nin: ["deleted", "accepted", "cancelled"],
    },
  })
    .then((appliedApplication) => {
      console.log(appliedApplication);
      if (appliedApplication !== null) {
        res.status(400).json({
          message: "You have already applied for this job",
        });
        return;
      }

      Job.findOne({ _id: jobId })
        .then((job) => {
          if (job === null) {
            res.status(404).json({
              message: "Job does not exist",
            });
            return;
          }
          Application.countDocuments({
            jobId: jobId,
            status: {
              $nin: ["rejected", "deleted", "cancelled", "finished"],
            },
          })
            .then((activeApplicationCount) => {
              if (activeApplicationCount < job.maxApplicants) {
                Application.countDocuments({
                  userId: user._id,
                  status: {
                    $nin: ["rejected", "deleted", "cancelled", "finished"],
                  },
                })
                  .then((myActiveApplicationCount) => {
                    if (myActiveApplicationCount < 10) {
                      Application.countDocuments({
                        userId: user._id,
                        status: "accepted",
                      }).then((acceptedJobs) => {
                        if (acceptedJobs === 0) {
                          const application = new Application({
                            userId: user._id,
                            recruiterId: job.userId,
                            jobId: job._id,
                            status: "applied",
                            sop: data.sop,
                          });
                          application
                            .save()
                            .then(() => {
                              res.json({
                                message: "Job application successful",
                              });
                            })
                            .catch((err) => {
                              res.status(400).json(err);
                            });
                        } else {
                          res.status(400).json({
                            message:
                              "You already have an accepted job. Hence you cannot apply.",
                          });
                        }
                      });
                    } else {
                      res.status(400).json({
                        message:
                          "You have 10 active applications. Hence you cannot apply.",
                      });
                    }
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                res.status(400).json({
                  message: "Application limit reached",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        })
        .catch((err) => {
          res.status(400).json(err);
        });
    })
    .catch((err) => {
      res.json(400).json(err);
    });
});

// recruiter gets applications for a particular job [pagination] [todo: test: done]
router.get("/jobs/:id/applications", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type != "recruiter") {
    res.status(401).json({
      message: "You don't have permissions to view job applications",
    });
    return;
  }
  const jobId = req.params.id;

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  let findParams = {
    jobId: jobId,
    recruiterId: user._id,
  };

  let sortParams = {};

  if (req.query.status) {
    findParams = {
      ...findParams,
      status: req.query.status,
    };
  }

  Application.find(findParams)
    .collation({ locale: "en" })
    .sort(sortParams)
    // .skip(skip)
    // .limit(limit)
    .then((applications) => {
      res.json(applications);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// recruiter/applicant gets all his applications [pagination]
router.get("/applications", jwtAuth, (req, res) => {
  const user = req.user;

  // const page = parseInt(req.query.page) ? parseInt(req.query.page) : 1;
  // const limit = parseInt(req.query.limit) ? parseInt(req.query.limit) : 10;
  // const skip = page - 1 >= 0 ? (page - 1) * limit : 0;

  Application.aggregate([
    {
      $lookup: {
        from: "jobapplicantinfos",
        localField: "userId",
        foreignField: "userId",
        as: "jobApplicant",
      },
    },
    { $unwind: "$jobApplicant" },
    {
      $lookup: {
        from: "jobs",
        localField: "jobId",
        foreignField: "_id",
        as: "job",
      },
    },
    { $unwind: "$job" },
    {
      $lookup: {
        from: "recruiterinfos",
        localField: "recruiterId",
        foreignField: "userId",
        as: "recruiter",
      },
    },
    { $unwind: "$recruiter" },
    {
      $match: {
        [user.type === "recruiter" ? "recruiterId" : "userId"]: user._id,
      },
    },
    {
      $sort: {
        dateOfApplication: -1,
      },
    },
  ])
    .then((applications) => {
      res.json(applications);
    })
    .catch((err) => {
      res.status(400).json(err);
    });
});

// update status of application: [Applicant: Can cancel, Recruiter: Can do everything] [todo: test: done]

router.put("/applications/:id", jwtAuth, async (req, res) => {
  const user = req.user;
  const id = req.params.id;
  const status = req.body.status;

  try {
    if (user.type === "recruiter") {
      if (
        status === "accepted" ||
        status === "shortlisted" ||
        status === "rejected" ||
        status === "cancelled" ||
        status === "finished" ||
        status === "deleted"
      ) {
        const application = await Application.findOne({
          _id: id,
          recruiterId: user._id,
        });

        if (!application) {
          return res.status(404).json({
            message: "Application not found",
          });
        }

        const job = await Job.findOne({
          _id: application.jobId,
          userId: user._id,
        });

        if (!job) {
          return res.status(404).json({
            message: "Job does not exist",
          });
        }

        const activeApplicationCount = await Application.countDocuments({
          recruiterId: user._id,
          jobId: job._id,
          status: "accepted",
        });

        if (activeApplicationCount >= job.maxPositions) {
          return res.status(400).json({
            message: "All positions for this job are already filled",
          });
        }

        application.status = status;
        application.dateOfJoining = req.body.dateOfJoining;

        await application.save();

        await Application.updateMany(
          {
            _id: { $ne: application._id },
            userId: application.userId,
            status: {
              $nin: [
                "rejected",
                "shortlisted",
                "deleted",
                "cancelled",
                "accepted",
                "finished",
              ],
            },
          },
          {
            $set: {
              status: "cancelled",
            },
          },
          { multi: true }
        );

        if (status === "accepted") {
          await Job.findOneAndUpdate(
            {
              _id: job._id,
              userId: user._id,
            },
            {
              $set: {
                acceptedCandidates: activeApplicationCount + 1,
              },
            }
          );
        }

        const applicant = await User.findById(application.userId);

        const jobDetails = await Job.findById(job._id);
        const recruiterDetails = await Recruiter.findOne({ userId: user._id });

        let emailSubject = "";
        let emailBody = "";

        switch (status) {
          case "accepted":
            emailSubject = `Your application for "${jobDetails.title}" at "${recruiterDetails.companyName}" has been accepted`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
          <style>
            /* Define your styles here */
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #fff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #333;
            }
            p {
              color: #666;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #401d1d;
              color: #fff !important;
            text-decoration: none !important;
              border-radius: 5px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Congratulations!</h1>
            <p>Your application for the job "${jobDetails.title}" at "${recruiterDetails.companyName}" has been accepted.</p>
            <a href="https://linkit-job-board.vercel.app/applications" class="btn">View Details</a>
          </div>
        </body>
      </html>
    `;
            break;
          case "shortlisted":
            emailSubject = `You are shortlisted for "${jobDetails.title}" application at "${recruiterDetails.companyName}".`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
          <style>
            /* Define your styles here */
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #fff;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #333;
            }
            p {
              color: #666;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background: #401d1d;
              color: #fff !important;
            text-decoration: none !important;
              border-radius: 5px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Congratulations!</h1>
            <p>You are shortlisted for "${jobDetails.title}" application at "${recruiterDetails.companyName}".</p>
            <a href="https://linkit-job-board.vercel.app/applications" class="btn">View Details</a>
          </div>
        </body>
      </html>
    `;
            break;
          case "rejected":
            emailSubject = `Your application for "${jobDetails.title}" at "${recruiterDetails.companyName}" has been rejected`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
        <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #fff;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          color: #666;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #401d1d;
          color: #fff !important;
            text-decoration: none !important;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
        </head>
        <body>
          <div class="container">
            <h1>Unfortunately,</h1>
            <p>We regret to inform you that your application for the job "${jobDetails.title}" at "${recruiterDetails.companyName}" has been rejected.</p>
            <p>Thank you for applying!</p>
          </div>
        </body>
      </html>
    `;
            break;
          case "finished":
            emailSubject = `Job "${jobDetails.title}" at "${recruiterDetails.companyName}" has been completed`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
          <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
          }
          p {
            color: #666;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #401d1d;
            color: #fff !important;
            text-decoration: none !important;
            border-radius: 5px;
            margin-top: 15px;
          }
        </style>
          </head>
          <body>
          <div class="container">
            <h1>Congratulations!</h1>
            <p>You have successfully completed your "${jobDetails.title}" job at "${recruiterDetails.companyName}". Thank you for your participation!</p>
            <p>Please rate the job to help others and company</p>
            <a href="https://linkit-job-board.vercel.app/applications" class="btn">Rate Job</a>
            <p>Feel free to check other available opportunities.</p>
            <a href="https://linkit-job-board.vercel.app/home" class="btn">Explore more Jobs</a>
          </div>
        </html>
      `;
            break;
          case "cancelled":
            emailSubject = `Job "${jobDetails.title}" at "${recruiterDetails.companyName}" has been cancelled`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">
          <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
          }
          p {
            color: #666;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #401d1d;
            color: #fff !important;
            text-decoration: none !important;
            border-radius: 5px;
            margin-top: 15px;
          }
        </style>
          </head>
          <body>
          <div class="container">
            <h1>"${recruiterDetails.companyName}" has cancelled the job</h1>
            <p>We regret to inform you that the "${recruiterDetails.companyName}" has cancelled the "${jobDetails.title}" job.</p>
            <p>Thank you for your interest and apologies for any inconvenience caused.</p>
            <p>Feel free to explore other available opportunities.</p>
            <a href="https://linkit-job-board.vercel.app/home" class="btn">Explore more Jobs</a>
          </div>
        </body>
        </html>
      `;
            break;
          case "deleted":
            emailSubject = `"${recruiterDetails.companyName}" has deleted the Job`;
            emailBody = `<!DOCTYPE html>
            <html lang="en">
            
            <head>
                <meta charset="UTF-8">>
          <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
          }
          p {
            color: #666;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #401d1d;
            color: #fff !important;
            text-decoration: none !important;
            border-radius: 5px;
            margin-top: 15px;
          }
        </style>
          </head>
          <body>
      <div class="container">
        <h1>"${recruiterDetails.companyName}" has deleted the Job</h1>
        <p>We regret to inform you that the "${recruiterDetails.companyName}" has deleted the "${jobDetails.title}" Job.</p>
        <p>Thank you for your interest and apologies for any inconvenience caused.</p>
        <p>Feel free to explore other available opportunities.</p>
        <a href="https://linkit-job-board.vercel.app/home" class="btn">Explore more Jobs</a>
      </div>
    </body>
        </html>
      `;
            break;
        }

        await sendEmail({
          to: applicant.email,
          subject: emailSubject,
          html: emailBody,
        });

        return res.json({
          message: `Application ${status} successfully`,
        });
      } else {
        const updatedApplication = await Application.findOneAndUpdate(
          {
            _id: id,
            recruiterId: user._id,
            status: { $nin: ["rejected", "deleted", "cancelled"] },
          },
          {
            $set: {
              status: status,
            },
          }
        );

        if (!updatedApplication) {
          return res.status(400).json({
            message: "Application status cannot be updated",
          });
        }

        if (status === "finished") {
          return res.json({
            message: `Job ${status} successfully`,
          });
        } else {
          return res.json({
            message: `Application ${status} successfully`,
          });
        }
      }
    } else {
      if (status === "cancelled") {
        const canceledApplication = await Application.findOneAndUpdate(
          {
            _id: id,
            userId: user._id,
          },
          {
            $set: {
              status: status,
            },
          }
        );

        if (!canceledApplication) {
          return res.status(400).json({
            message: "Application status cannot be updated",
          });
        }

        return res.json({
          message: `Application ${status} successfully`,
        });
      } else {
        return res.status(401).json({
          message: "You don't have permissions to update job status",
        });
      }
    }
  } catch (err) {
    return res.status(400).json(err);
  }
});

// get a list of final applicants for current job : recruiter
// get a list of final applicants for all his jobs : recuiter
router.get("/applicants", jwtAuth, (req, res) => {
  const user = req.user;
  if (user.type === "recruiter") {
    let findParams = {
      recruiterId: user._id,
    };
    if (req.query.jobId) {
      findParams = {
        ...findParams,
        jobId: new mongoose.Types.ObjectId(req.query.jobId),
      };
    }
    if (req.query.status) {
      if (Array.isArray(req.query.status)) {
        findParams = {
          ...findParams,
          status: { $in: req.query.status },
        };
      } else {
        findParams = {
          ...findParams,
          status: req.query.status,
        };
      }
    }
    let sortParams = {};

    if (!req.query.asc && !req.query.desc) {
      sortParams = { _id: 1 };
    }

    if (req.query.asc) {
      if (Array.isArray(req.query.asc)) {
        req.query.asc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: 1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.asc]: 1,
        };
      }
    }

    if (req.query.desc) {
      if (Array.isArray(req.query.desc)) {
        req.query.desc.map((key) => {
          sortParams = {
            ...sortParams,
            [key]: -1,
          };
        });
      } else {
        sortParams = {
          ...sortParams,
          [req.query.desc]: -1,
        };
      }
    }

    Application.aggregate([
      {
        $lookup: {
          from: "jobapplicantinfos",
          localField: "userId",
          foreignField: "userId",
          as: "jobApplicant",
        },
      },
      { $unwind: "$jobApplicant" },
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      { $match: findParams },
      { $sort: sortParams },
    ])
      .then((applications) => {
        if (applications.length === 0) {
          res.status(404).json({
            message: "No applicants found",
          });
          return;
        }
        res.json(applications);
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    res.status(400).json({
      message: "You are not allowed to access applicants list",
    });
  }
});

// to add or update a rating [todo: test]
router.put("/rating", jwtAuth, (req, res) => {
  const user = req.user;
  const data = req.body;
  if (user.type === "recruiter") {
    // can rate applicant
    Rating.findOne({
      senderId: user._id,
      receiverId: data.applicantId,
      category: "applicant",
    })
      .then((rating) => {
        if (rating === null) {
          console.log("new rating");
          Application.countDocuments({
            userId: data.applicantId,
            recruiterId: user._id,
            status: {
              $in: ["accepted", "finished"],
            },
          })
            .then((acceptedApplicant) => {
              if (acceptedApplicant > 0) {
                // add a new rating

                rating = new Rating({
                  category: "applicant",
                  receiverId: data.applicantId,
                  senderId: user._id,
                  rating: data.rating,
                });

                rating
                  .save()
                  .then(() => {
                    // get the average of ratings
                    Rating.aggregate([
                      {
                        $match: {
                          receiverId: mongoose.Types.ObjectId(data.applicantId),
                          category: "applicant",
                        },
                      },
                      {
                        $group: {
                          _id: {},
                          average: { $avg: "$rating" },
                        },
                      },
                    ])
                      .then((result) => {
                        // update the user's rating
                        if (result === null) {
                          res.status(400).json({
                            message: "Error while calculating rating",
                          });
                          return;
                        }
                        const avg = result[0].average;

                        JobApplicant.findOneAndUpdate(
                          {
                            userId: data.applicantId,
                          },
                          {
                            $set: {
                              rating: avg,
                            },
                          }
                        )
                          .then((applicant) => {
                            if (applicant === null) {
                              res.status(400).json({
                                message:
                                  "Error while updating applicant's average rating",
                              });
                              return;
                            }
                            res.json({
                              message: "Rating added successfully",
                            });
                          })
                          .catch((err) => {
                            res.status(400).json(err);
                          });
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                // you cannot rate
                res.status(400).json({
                  message:
                    "Applicant didn't worked under you. Hence you cannot give a rating.",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        } else {
          rating.rating = data.rating;
          rating
            .save()
            .then(() => {
              // get the average of ratings
              Rating.aggregate([
                {
                  $match: {
                    receiverId: mongoose.Types.ObjectId(data.applicantId),
                    category: "applicant",
                  },
                },
                {
                  $group: {
                    _id: {},
                    average: { $avg: "$rating" },
                  },
                },
              ])
                .then((result) => {
                  // update the user's rating
                  if (result === null) {
                    res.status(400).json({
                      message: "Error while calculating rating",
                    });
                    return;
                  }
                  const avg = result[0].average;
                  JobApplicant.findOneAndUpdate(
                    {
                      userId: data.applicantId,
                    },
                    {
                      $set: {
                        rating: avg,
                      },
                    }
                  )
                    .then((applicant) => {
                      if (applicant === null) {
                        res.status(400).json({
                          message:
                            "Error while updating applicant's average rating",
                        });
                        return;
                      }
                      res.json({
                        message: "Rating updated successfully",
                      });
                    })
                    .catch((err) => {
                      res.status(400).json(err);
                    });
                })
                .catch((err) => {
                  res.status(400).json(err);
                });
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  } else {
    // applicant can rate job
    Rating.findOne({
      senderId: user._id,
      receiverId: data.jobId,
      category: "job",
    })
      .then((rating) => {
        console.log(user._id);
        console.log(data.jobId);
        console.log(rating);
        if (rating === null) {
          console.log(rating);
          Application.countDocuments({
            userId: user._id,
            jobId: data.jobId,
            status: {
              $in: ["accepted", "finished"],
            },
          })
            .then((acceptedApplicant) => {
              if (acceptedApplicant > 0) {
                // add a new rating

                rating = new Rating({
                  category: "job",
                  receiverId: data.jobId,
                  senderId: user._id,
                  rating: data.rating,
                });

                rating
                  .save()
                  .then(() => {
                    // get the average of ratings
                    Rating.aggregate([
                      {
                        $match: {
                          receiverId: mongoose.Types.ObjectId(data.jobId),
                          category: "job",
                        },
                      },
                      {
                        $group: {
                          _id: {},
                          average: { $avg: "$rating" },
                        },
                      },
                    ])
                      .then((result) => {
                        if (result === null) {
                          res.status(400).json({
                            message: "Error while calculating rating",
                          });
                          return;
                        }
                        const avg = result[0].average;
                        Job.findOneAndUpdate(
                          {
                            _id: data.jobId,
                          },
                          {
                            $set: {
                              rating: avg,
                            },
                          }
                        )
                          .then((foundJob) => {
                            if (foundJob === null) {
                              res.status(400).json({
                                message:
                                  "Error while updating job's average rating",
                              });
                              return;
                            }
                            res.json({
                              message: "Rating added successfully",
                            });
                          })
                          .catch((err) => {
                            res.status(400).json(err);
                          });
                      })
                      .catch((err) => {
                        res.status(400).json(err);
                      });
                  })
                  .catch((err) => {
                    res.status(400).json(err);
                  });
              } else {
                // you cannot rate
                res.status(400).json({
                  message:
                    "You haven't worked for this job. Hence you cannot give a rating.",
                });
              }
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        } else {
          // update the rating
          rating.rating = data.rating;
          rating
            .save()
            .then(() => {
              // get the average of ratings
              Rating.aggregate([
                {
                  $match: {
                    receiverId: mongoose.Types.ObjectId(data.jobId),
                    category: "job",
                  },
                },
                {
                  $group: {
                    _id: {},
                    average: { $avg: "$rating" },
                  },
                },
              ])
                .then((result) => {
                  if (result === null) {
                    res.status(400).json({
                      message: "Error while calculating rating",
                    });
                    return;
                  }
                  const avg = result[0].average;
                  console.log(avg);

                  Job.findOneAndUpdate(
                    {
                      _id: data.jobId,
                    },
                    {
                      $set: {
                        rating: avg,
                      },
                    }
                  )
                    .then((foundJob) => {
                      if (foundJob === null) {
                        res.status(400).json({
                          message: "Error while updating job's average rating",
                        });
                        return;
                      }
                      res.json({
                        message: "Rating added successfully",
                      });
                    })
                    .catch((err) => {
                      res.status(400).json(err);
                    });
                })
                .catch((err) => {
                  res.status(400).json(err);
                });
            })
            .catch((err) => {
              res.status(400).json(err);
            });
        }
      })
      .catch((err) => {
        res.status(400).json(err);
      });
  }
});

// get personal rating
router.get("/rating", jwtAuth, (req, res) => {
  const user = req.user;
  Rating.findOne({
    senderId: user._id,
    receiverId: req.query.id,
    category: user.type === "recruiter" ? "applicant" : "job",
  }).then((rating) => {
    if (rating === null) {
      res.json({
        rating: -1,
      });
      return;
    }
    res.json({
      rating: rating.rating,
    });
  });
});

// Premiun Plan
router.post("/purchasePlan", jwtAuth, async (req, res) => {
  try {
    var instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { userId, userType, plan, amount } = req.body;

    const receipt = `plan_${userId}_${Date.now()}`.slice(0, 40);
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt,
      payment_capture: 1,
    };

    const order = await instance.orders.create(options);

    const newPlan = new Plan({
      userId,
      userType,
      plan,
      amount,
      order_id: order.id,
    });

    await newPlan.save();

    res.json({ orderId: order.id, orderAmount: order.amount });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the order" });
  }
});

router.post("/verifyPayment", jwtAuth, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(body.toString());
    const expectedSignature = hmac.digest("hex");
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      res
        .status(200)
        .json({ message: "Payment verified and saved successfully" });
    } else {
      res.status(400).json({ error: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Error while saving payment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/updatePlan", jwtAuth, async (req, res) => {
  try {
    const { userId, userType, plan, paymentStatus, payment_id, order_id } =
      req.body;

    const currentDate = new Date();
    let expireDate = new Date(currentDate);

    if (plan === "Monthly") {
      expireDate.setMonth(expireDate.getMonth() + 1);
    } else if (plan === "Quarterly") {
      expireDate.setMonth(expireDate.getMonth() + 3);
    } else if (plan === "Yearly") {
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    }

    const expireon = expireDate.toISOString();

    const updatedPlan = await Plan.findOneAndUpdate(
      { userId, userType, plan },
      {
        $set: {
          expireon,
          paymentStatus,
          payment_id,
          order_id,
        },
      },
      { new: true }
    );

    if (!updatedPlan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    res.json({ message: "Plan details updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update premium status based on successful payment
router.put("/updatePremium", jwtAuth, async (req, res) => {
  const { userId, userType, paymentStatus } = req.body;

  try {
    if (!userId || !userType || !paymentStatus) {
      return res.status(400).json({ message: "Invalid data" });
    }

    let userSchema;
    if (userType === "recruiter") {
      userSchema = Recruiter;
    } else {
      userSchema = JobApplicant;
    }

    const updatedUser = await userSchema.findOneAndUpdate(
      { userId: userId },
      { $set: { premium: paymentStatus === "Paid" } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: `${userType} not found` });
    }

    if (paymentStatus === "Expired") {
      await userSchema.findOneAndUpdate(
        { userId: userId },
        { $set: { premium: false } }
      );
    }

    return res
      .status(200)
      .json({ message: "Premium status updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/userPlanData/:userId", jwtAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    const userPlanData = await Plan.findOne({ userId });

    if (!userPlanData) {
      return res.status(404).json({ message: "User plan data not found" });
    }

    if (userPlanData.expireon) {
      const expireDate = new Date(userPlanData.expireon);
      const currentDate = new Date();

      if (currentDate > expireDate) {
        await Plan.findOneAndUpdate(
          { userId },
          { $set: { paymentStatus: "Expired" } }
        );
        return res.status(200).json({ message: "Plan data expired" });
      }
    }

    res.status(200).json(userPlanData);
  } catch (error) {
    console.error("Error fetching user's plan data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
