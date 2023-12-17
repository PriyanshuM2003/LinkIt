import React from "react";
import { Container, Typography, Grid, makeStyles } from "@material-ui/core";
import BusinessIcon from "@material-ui/icons/Business";
import logoImg from "./logo2.png";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  title: {
    marginBottom: theme.spacing(4),
    color: "#401d1d",
  },
  avatar: {
    width: theme.spacing(12),
    height: theme.spacing(12),
    marginBottom: theme.spacing(2),
  },
}));

const About = () => {
  const classes = useStyles();
  return (
    <Container maxWidth="lg" className={classes.container}>
      <Typography variant="h2" align="center" className={classes.title}>
        About Us
      </Typography>
      <Grid container spacing={4} alignItems="center" justifyContent="center">
        <Grid item xs={12} md={6} align="center">
          <img alt="Linkit Logo" src={logoImg} width="170px" height="auto" />
          <Typography variant="h4" gutterBottom style={{ color: "#401d1d" }}>
            Welcome to LinkIt
          </Typography>
          <Typography variant="body1" paragraph style={{ color: "#401d1d" }}>
            Linkit is dedicated to connecting talented individuals with their
            dream jobs and helping companies find the right candidates to fuel
            their growth and success.
          </Typography>
        </Grid>
        <Grid item xs={12} md={6} align="center">
          <BusinessIcon
            style={{ fontSize: 60, marginBottom: 16, color: "#401d1d" }}
          />
          <Typography variant="h4" gutterBottom style={{ color: "#401d1d" }}>
            Our Mission
          </Typography>
          <Typography variant="body1" paragraph style={{ color: "#401d1d" }}>
            At Linkit, our mission is to revolutionize the job search process by
            providing a seamless platform that brings together job seekers and
            employers in a way that's efficient, transparent, and rewarding for
            both parties.
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
};

export default About;
