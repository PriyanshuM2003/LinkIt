import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import Modal from "@material-ui/core/Modal";

const useStyles = makeStyles((theme) => ({
  footer: {
    marginTop: "1rem",
    backgroundColor: "#401d1d",
    color: theme.palette.primary.contrastText,
  },
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#401d1d",
    color: "#fff",
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
  link: {
    textDecoration: "none",
    color: "inherit",
    "&:hover": {
      textDecoration: "none",
      color: "red",
    },
  },
}));

function Footer() {
  const classes = useStyles();
  const [openModal, setOpenModal] = useState(false);

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

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
                style={{ cursor: "pointer" }}
                color="inherit"
                onClick={handleOpenModal}
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
        <Modal
          className={classes.modal}
          open={openModal}
          onClose={handleCloseModal}
        >
          <div className={classes.modalContent}>
            <Typography variant="h6">Contact Us</Typography>
            <Typography>
              You can contact us at:{" "}
              <Link
                href="mailto:tester146924@gmail.com"
                target="_blank"
                color="inherit"
                className={classes.link}
              >
                tester146924@gmail.com
              </Link>
            </Typography>
          </div>
        </Modal>
      </Container>
    </footer>
  );
}

export default Footer;
