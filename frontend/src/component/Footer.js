import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
  footer: {
    marginTop: "1rem",
    backgroundColor: "#401d1d",
    color: theme.palette.primary.contrastText,
  },
}));

function Footer() {
  const classes = useStyles();

  return (
    <footer className={classes.footer}>
      <Container maxWidth="md">
        <Grid
          container
          spacing={4}
          justifyContent="space-between"
          alignItems="center"
        >
          <Grid item xs={12} sm={6}>
            <Typography variant="body1">
              &copy; {new Date().getFullYear()} LinkIt | All rights reserved.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" align="right">
              <Link
                href="mailto:tester146924@gmail.com"
                target="_blank"
                color="inherit"
              >
                Contact Us
              </Link>
              {" | "}
              <Link href="/aboutus" color="inherit">
                About Us
              </Link>
              {" | "}
              <Link href="#" color="inherit">
                Privacy Policy
              </Link>
              {" | "}
              <Link href="#" color="inherit">
                Terms of Use
              </Link>
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </footer>
  );
}

export default Footer;
