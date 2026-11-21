"""JARVIS logging setup."""

import logging
import os
import sys


def setup_logging(name="jarvis", level=logging.INFO, logfile="jarvis.log"):
    """Configure a logger that writes to console and a rotating file."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(level)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    try:
        path = logfile
        if getattr(sys, "frozen", False):
            path = os.path.join(os.path.dirname(sys.executable), logfile)
        fh = logging.FileHandler(path, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except OSError:
        pass
    return logger