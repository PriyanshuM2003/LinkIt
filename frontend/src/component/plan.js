import React, { useContext, useEffect, useState } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  Button,
} from "@material-ui/core";
import axios from "axios";
import isAuth, { userType } from "../lib/isAuth";
import { makeStyles } from "@material-ui/core/styles";
import apiList from "../lib/apiList";
import { SetPopupContext } from "../App";

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },
  header: {
    textAlign: "center",
    margin: "20px auto",
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
    "&:hover": {
      transform: "scale(1.05)",
      boxShadow: "0 8px 16px 0 rgba(0,0,0,0.2)",
    },
    cursor: "pointer",
  },
  selectedCard: {
    border: "2px solid #401d1d",
  },
  tableContainer: {
    marginTop: theme.spacing(4),
  },
}));

const Plan = () => {
  const classes = useStyles();
  const [userId, setUserId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const user = isAuth() ? userType() : null;
  const setPopup = useContext(SetPopupContext);
  const [userPlanData, setUserPlanData] = useState(null);

  const handlePlanSelect = (index) => {
    setSelectedPlan(index);
    console.log("Selected Plan:", index);
  };

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await axios.get(apiList.user, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setUserId(response.data.userId);
      } catch (error) {
        console.error("Error fetching userId:", error);
      }
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchUserPlanData = async () => {
      try {
        const response = await axios.get(`${apiList.userPlanData}/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.data.expireon) {
          const expireDate = new Date(response.data.expireon);
          const currentDate = new Date();

          if (currentDate > expireDate) {
            await axios.put(
              apiList.updatePremium,
              {
                userId,
                userType: user,
                paymentStatus: "Expired",
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            await axios.delete(`${apiList.userPlanData}/${userId}`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            });

            setUserPlanData(null);
          } else {
            setUserPlanData(response.data);
          }
        }
      } catch (error) {
        console.error("Error fetching user's plan data:", error);
      }
    };

    if (userId) {
      fetchUserPlanData();
    }
  }, [userId]);

  const calculateAmount = (plan) => {
    let amount = 0;
    if (plan.title === "Monthly") {
      amount = parseInt(plan.price.slice(1));
    } else if (plan.title === "Quarterly") {
      amount = parseInt(plan.price.slice(1)) * 4;
    } else if (plan.title === "Yearly") {
      amount = parseInt(plan.price.slice(1)) * 12;
    }
    return amount;
  };

  const updatePlan = async (userId, userType, plan, paymentDetails) => {
    try {
      const response = await axios.put(
        apiList.updatePlan,
        {
          userId,
          userType,
          plan,
          paymentStatus: "Paid",
          payment_id: paymentDetails.razorpay_payment_id,
          order_id: paymentDetails.razorpay_order_id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      await axios.put(
        apiList.updatePremium,
        {
          userId,
          userType,
          paymentStatus: "Paid",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("Plan update response:", response.data);
      if (response.data.message === "Plan details updated successfully") {
        console.log("Update plan triggered successfully");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  const handlePurchase = async (plans, selectedPlan) => {
    try {
      if (!userId || selectedPlan === null || !plans[user]) {
        console.error("Invalid data or plan not found");
        return;
      }
      const selectedPlanData = plans[user][selectedPlan];

      const response = await axios.post(
        apiList.purchasePlan,
        {
          userId,
          userType: user,
          plan: selectedPlanData.title,
          amount: calculateAmount(selectedPlanData),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const orderDetails = response.data;

      if (orderDetails && orderDetails.orderAmount && orderDetails.orderId) {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY,
          amount: orderDetails.orderAmount,
          currency: "INR",
          name: "LinkIt",
          description: orderDetails.plan,
          order_id: orderDetails.orderId,
          handler: async function (response) {
            console.log("Payment successful:", response);
            setPopup({
              open: true,
              severity: "success",
              message: "Plan Purchased successfully",
            });
            await updatePlan(
              userId,
              user,
              selectedPlanData.title,
              response,
              "Paid"
            );
            window.location.reload();
          },
          callback_url: apiList.verifyPayment,
          theme: {
            color: "#401d1d",
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        console.error("Incomplete or missing order details received");
      }
    } catch (error) {
      console.error("Razorpay initiation error:", error);
      if (error.response) {
        console.error("Server responded with:", error.response.data);
        console.error("Status code:", error.response.status);
        console.error("Headers:", error.response.headers);
      } else if (error.request) {
        console.error(
          "Request was made but no response was received:",
          error.request
        );
      } else {
        console.error("Error setting up the request:", error.message);
      }
    }
  };

  const beautifyDate = (date) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(date).toLocaleDateString(undefined, options);
  };

  const renderUserSpecificText = () => {
    if (isAuth()) {
      const user = userType();
      if (user === "recruiter") {
        return (
          <Typography variant="body1" color="textSecondary">
            Revolutionize your hiring strategy with our Premium Plans! Gain
            unparalleled access to a vast pool of top-tier talent, streamline
            your recruitment process with advanced filters and analytics, and
            showcase your brand prominently to attract the best candidates. With
            priority support and exclusive tools, elevate your hiring game and
            build the dream team your company deserves.
          </Typography>
        );
      } else if (user === "applicant") {
        return (
          <Typography variant="body1" color="textSecondary">
            Unleash the full potential of your job search with our Premium
            Plans! Stand out to recruiters with enhanced visibility, get
            notified about exclusive job opportunities first, and receive
            priority support for a smoother application process. Explore a
            treasure trove of advanced tools designed to give your career the
            boost it deserves. Join our premium tier and embark on a journey
            towards your dream job!
          </Typography>
        );
      }
    }

    return (
      <Typography variant="body1" color="textSecondary">
        Sign in to explore our Premium Plans and take your job search or hiring
        process to the next level!
      </Typography>
    );
  };

  const plans = {
    recruiter: [
      {
        title: "Free",
        price: "₹0",
        features: [
          "No Access to Post Jobs on our Platform.",
          "0 Job Posting.",
          "No Chance to recruit Premium Applicants.",
          "Email support.",
        ],
      },
      {
        title: "Monthly",
        price: "₹199",
        features: [
          "Get Access to Post Jobs on our Platform.",
          "5 Job Posting.",
          "Access to recruit Premium Applicants.",
          "Priority email support.",
        ],
      },
      {
        title: "Quarterly",
        price: "₹299",
        features: [
          "Get Access to Post Jobs on our Platform.",
          "15 Job Posting.",
          "Access to recruit Premium Applicants.",
          "Priority email support.",
        ],
      },
      {
        title: "Yearly",
        price: "₹399",
        features: [
          "Get Access to Post Jobs on our Platform.",
          "Unlimited Job Posting.",
          "Access to recruit Premium Applicants.",
          "Priority email support",
        ],
      },
    ],
    applicant: [
      {
        title: "Free",
        price: "₹0",
        features: [
          "By Default for Beginners.",
          "No Premiun Badge.",
          "Apply to 10 Jobs at Once.",
          "Priority on Recruiter List is on your own LUCK.",
          "Chances of getting placed is on your own LUCK.",
          "Email support.",
        ],
      },
      {
        title: "Monthly",
        price: "₹99",
        features: [
          "Premiun Badge.",
          "Apply to 20 Jobs at Once.",
          "Top Priority on Recruiter List than Basic Users.",
          "99% Chance of getting placed from our side.",
          "Priority email support.",
          "",
        ],
      },
      {
        title: "Quarterly",
        price: "₹88",
        features: [
          "Premiun Badge.",
          "Apply to 40 Jobs at Once.",
          "Top Priority on Recruiter List than Basic Users.",
          "99% Chance of getting placed from our side.",
          "Priority email support.",
          "",
        ],
      },
      {
        title: "Yearly",
        price: "₹84",
        features: [
          "Premiun Badge.",
          "Apply to Unlimited Jobs at Once",
          "Top Priority on Recruiter List than Basic Users.",
          "99% Chance of getting placed from our side.",
          "Priority email support.",
        ],
      },
    ],
  };

  return (
    <Container className={classes.root}>
      <header className={classes.header}>
        <Typography variant="h2" gutterBottom style={{ color: "#401d1d" }}>
          Premium Plans
        </Typography>
        {renderUserSpecificText()}
      </header>
      <main>
        <Grid container spacing={3}>
          {user &&
            plans[user].map((plan, index) => {
              const isPlanPurchased =
                userPlanData &&
                userPlanData.paymentStatus === "Paid" &&
                userPlanData.plan === plan.title;
              const isAnyPlanPurchased =
                userPlanData && userPlanData.paymentStatus === "Paid";
              return (
                <Grid item xs={12} sm={3} key={index}>
                  {isPlanPurchased ? (
                    <Card
                      className={`${classes.card} ${
                        selectedPlan === index ? classes.selectedCard : ""
                      }`}
                      onClick={() => handlePlanSelect(index)}
                    >
                      <CardHeader title={plan.title} />
                      <CardContent>
                        <Typography variant="h4">
                          {plan.price} <small>/mo</small>
                        </Typography>
                        <Typography variant="body2">
                          <strong>
                            Expires on:{" "}
                            {userPlanData.expireon
                              ? beautifyDate(userPlanData.expireon)
                              : ""}
                          </strong>
                        </Typography>
                        <List>
                          {plan.features.map((feature, index) => (
                            <ListItem key={index}>{feature}</ListItem>
                          ))}
                        </List>
                        <Button
                          variant="outlined"
                          size="large"
                          fullWidth
                          style={{
                            backgroundColor: "#401d1d",
                            color: "white",
                          }}
                        >
                          Your Current Plan
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card
                      className={`${classes.card} ${
                        selectedPlan === index ? classes.selectedCard : ""
                      }`}
                      onClick={() => handlePlanSelect(index)}
                    >
                      <CardHeader title={plan.title} />
                      <CardContent>
                        <Typography variant="h4">
                          {plan.price} <small>/mo</small>
                        </Typography>
                        <List>
                          {plan.features.map((feature, index) => (
                            <ListItem key={index}>{feature}</ListItem>
                          ))}
                        </List>
                        {plan.title !== "Free" && !isAnyPlanPurchased && (
                          <Button
                            variant="outlined"
                            size="large"
                            fullWidth
                            style={{
                              backgroundColor: "#401d1d",
                              color: "white",
                            }}
                            onClick={() => handlePurchase(plans, index)}
                          >
                            Get plan
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  {/* {isAnyPlanPurchased && !isPlanPurchased && (
                    <div style={{ textAlign: "center", marginTop: "10px" }}>
                      <Typography variant="caption">
                        Plan already purchased
                      </Typography>
                    </div>
                  )} */}
                </Grid>
              );
            })}
        </Grid>
      </main>
    </Container>
  );
};

export default Plan;
